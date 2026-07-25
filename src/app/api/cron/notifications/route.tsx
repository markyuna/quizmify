import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  getUserPreferredLocale,
  isReasonableLocalHour,
  getUserLocalDateKey,
  getIsoWeekKey,
  utcDaysBetween,
  tryLogNotification,
} from "@/lib/notifications";
import { getOrCreateTodaysChallenge } from "@/lib/dailyChallenge";
import { buildWeeklySummary } from "@/lib/weeklySummary";
import { TRIAL_EXPIRY_WARNING_HOURS } from "@/lib/premium";
import { getSiteUrl } from "@/lib/site";
import { emailStrings } from "@/emails/i18n";
import StreakReminderEmail from "@/emails/StreakReminderEmail";
import DailyChallengeReminderEmail from "@/emails/DailyChallengeReminderEmail";
import WeeklySummaryEmail from "@/emails/WeeklySummaryEmail";
import PremiumEndingSoonEmail from "@/emails/PremiumEndingSoonEmail";
import { LOCALES } from "@/i18n/locales";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Hobby crons run at most once a day (no hourly granularity), so
// this whole pipeline runs from one fixed-UTC-time invocation. 23:00 UTC
// lands in the evening for most of this app's Spanish-speaking timezones
// (20:00 in Argentina, 18:00 in Mexico/Colombia); it's an approximation,
// not true per-user local time -- isReasonableLocalHour below at least
// skips users for whom that would be an unreasonable hour (e.g. 4am).
// Moving to Vercel Pro would allow an hourly cron that targets each user's
// actual local evening instead.
const STREAK_REMINDER_HOUR_WINDOW = { min: 17, max: 23 };
const DAILY_CHALLENGE_HOUR_WINDOW = { min: 10, max: 23 };
const WEEKLY_SUMMARY_DAY_OF_WEEK = 0; // Sunday (UTC)

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const appUrl = getSiteUrl();
  const results = {
    streakReminders: 0,
    dailyChallengeReminders: 0,
    weeklySummaries: 0,
    premiumEndingSoon: 0,
    errors: 0,
  };

  // --- Streak-at-risk reminders ---
  const streakCandidates = await prisma.user.findMany({
    where: {
      currentStreak: { gte: 2 },
      email: { not: null },
      lastQuizDate: { not: null },
    },
    select: {
      id: true,
      email: true,
      currentStreak: true,
      lastQuizDate: true,
      timezone: true,
      notificationPreference: { select: { streakReminderEmail: true } },
    },
  });

  for (const user of streakCandidates) {
    try {
      if (user.notificationPreference?.streakReminderEmail === false) continue;
      if (!user.email || !user.lastQuizDate) continue;
      // Only "about to lapse today" -- if gapDays is already >= 2 the streak
      // has effectively lapsed already (see getEffectiveStreak) and there's
      // no same-day save to prompt.
      if (utcDaysBetween(user.lastQuizDate, now) !== 1) continue;
      if (
        !isReasonableLocalHour(user.timezone, now, STREAK_REMINDER_HOUR_WINDOW.min, STREAK_REMINDER_HOUR_WINDOW.max)
      ) {
        continue;
      }

      const dateKey = getUserLocalDateKey(user.timezone, now);
      const claimed = await tryLogNotification(user.id, "streak_reminder", dateKey);
      if (!claimed) continue;

      const locale = await getUserPreferredLocale(user.id);
      const { sent } = await sendEmail({
        to: user.email,
        subject: emailStrings[locale].streakReminder.subject(user.currentStreak),
        react: <StreakReminderEmail locale={locale} streak={user.currentStreak} appUrl={appUrl} />,
      });
      if (sent) results.streakReminders++;
    } catch (error) {
      console.error("streak reminder failed for user", user.id, error);
      results.errors++;
    }
  }

  // --- Daily challenge reminders ---
  const challengesByLocale = new Map<
    string,
    Awaited<ReturnType<typeof getOrCreateTodaysChallenge>>
  >();
  for (const locale of LOCALES) {
    challengesByLocale.set(locale, await getOrCreateTodaysChallenge(locale, now));
  }

  const dailyChallengeCandidates = await prisma.user.findMany({
    where: { email: { not: null } },
    select: {
      id: true,
      email: true,
      timezone: true,
      notificationPreference: { select: { dailyChallengeEmail: true } },
    },
  });

  for (const user of dailyChallengeCandidates) {
    try {
      if (user.notificationPreference?.dailyChallengeEmail === false) continue;
      if (!user.email) continue;
      if (
        !isReasonableLocalHour(user.timezone, now, DAILY_CHALLENGE_HOUR_WINDOW.min, DAILY_CHALLENGE_HOUR_WINDOW.max)
      ) {
        continue;
      }

      const locale = await getUserPreferredLocale(user.id);
      const challenge = challengesByLocale.get(locale);
      if (!challenge) continue;

      const alreadyPlayed = await prisma.dailyChallengeAttempt.findUnique({
        where: { dailyChallengeId_userId: { dailyChallengeId: challenge.id, userId: user.id } },
        select: { id: true },
      });
      if (alreadyPlayed) continue;

      const dateKey = getUserLocalDateKey(user.timezone, now);
      const claimed = await tryLogNotification(user.id, "daily_challenge_reminder", dateKey);
      if (!claimed) continue;

      const { sent } = await sendEmail({
        to: user.email,
        subject: emailStrings[locale].dailyChallengeReminder.subject,
        react: <DailyChallengeReminderEmail locale={locale} topic={challenge.topic} appUrl={appUrl} />,
      });
      if (sent) results.dailyChallengeReminders++;
    } catch (error) {
      console.error("daily challenge reminder failed for user", user.id, error);
      results.errors++;
    }
  }

  // --- Weekly summary (once a week, reuses this same daily cron) ---
  if (now.getUTCDay() === WEEKLY_SUMMARY_DAY_OF_WEEK) {
    const weekKey = getIsoWeekKey(now);
    const summaryCandidates = await prisma.user.findMany({
      where: { email: { not: null } },
      select: {
        id: true,
        email: true,
        notificationPreference: { select: { weeklySummaryEmail: true } },
      },
    });

    for (const user of summaryCandidates) {
      try {
        if (user.notificationPreference?.weeklySummaryEmail === false) continue;
        if (!user.email) continue;

        const summary = await buildWeeklySummary(user.id, now);
        if (summary.quizzesPlayed === 0) continue; // don't nag inactive users weekly

        const claimed = await tryLogNotification(user.id, "weekly_summary", weekKey);
        if (!claimed) continue;

        const locale = await getUserPreferredLocale(user.id);
        const { sent } = await sendEmail({
          to: user.email,
          subject: emailStrings[locale].weeklySummary.subject,
          react: <WeeklySummaryEmail locale={locale} appUrl={appUrl} {...summary} />,
        });
        if (sent) results.weeklySummaries++;
      } catch (error) {
        console.error("weekly summary failed for user", user.id, error);
        results.errors++;
      }
    }
  }

  // --- Temporary Pro (trial or referral) ending within ~24h ---
  // Not gated by NotificationPreference or isReasonableLocalHour like the
  // others -- this is a time-sensitive transactional notice about access
  // about to change, not a discretionary engagement nudge.
  {
    const warningWindowMs = TRIAL_EXPIRY_WARNING_HOURS * 60 * 60 * 1000;
    const endingSoonCandidates = await prisma.user.findMany({
      where: {
        subscriptionStatus: { not: "pro" },
        premiumUntil: { gt: now, lte: new Date(now.getTime() + warningWindowMs) },
        email: { not: null },
      },
      select: { id: true, email: true, premiumUntil: true },
    });

    for (const user of endingSoonCandidates) {
      try {
        if (!user.email || !user.premiumUntil) continue;

        // Keyed to the specific expiry date being warned about, so a later
        // referral that pushes premiumUntil further out naturally earns a
        // fresh warning instead of being silently suppressed.
        const dateKey = user.premiumUntil.toISOString().slice(0, 10);
        const claimed = await tryLogNotification(user.id, "premium_ending_soon", dateKey);
        if (!claimed) continue;

        const locale = await getUserPreferredLocale(user.id);
        const { sent } = await sendEmail({
          to: user.email,
          subject: emailStrings[locale].premiumEndingSoon.subject,
          react: <PremiumEndingSoonEmail locale={locale} appUrl={appUrl} />,
        });
        if (sent) results.premiumEndingSoon++;
      } catch (error) {
        console.error("premium ending soon notice failed for user", user.id, error);
        results.errors++;
      }
    }
  }

  return NextResponse.json({ success: true, ...results });
}
