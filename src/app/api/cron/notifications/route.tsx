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
  getRecentlyEngagedUserIds,
  getLastActiveAt,
  getWinbackStage,
  getWinbackDateKey,
} from "@/lib/notifications";
import { getOrCreateTodaysChallenge } from "@/lib/dailyChallenge";
import { loadDailyChallengeSocialContext } from "@/lib/dailyChallengeSocial";
import { getNeuronsProgress, NEURONS_PER_BATCH } from "@/lib/neurons";
import { MIN_NEURON_GAME_COST } from "@/lib/neurons/costs";
import { isEffectivelyPro } from "@/lib/paywall";
import { buildWeeklySummary } from "@/lib/weeklySummary";
import { TRIAL_EXPIRY_WARNING_HOURS } from "@/lib/premium";
import { getSiteUrl } from "@/lib/site";
import { emailStrings } from "@/emails/i18n";
import StreakReminderEmail from "@/emails/StreakReminderEmail";
import DailyChallengeReminderEmail from "@/emails/DailyChallengeReminderEmail";
import WeeklySummaryEmail from "@/emails/WeeklySummaryEmail";
import PremiumEndingSoonEmail from "@/emails/PremiumEndingSoonEmail";
import WinbackEmail from "@/emails/WinbackEmail";
import NeuronsReminderEmail from "@/emails/NeuronsReminderEmail";
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
const WINBACK_HOUR_WINDOW = { min: 10, max: 23 };
const NEURONS_REMINDER_HOUR_WINDOW = { min: 10, max: 23 };
const WEEKLY_SUMMARY_DAY_OF_WEEK = 0; // Sunday (UTC)
// Neurons reminders only go to recently active users -- anyone quiet for
// longer is the win-back email's audience (see getWinbackStage).
const NEURONS_REMINDER_MAX_INACTIVE_DAYS = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    winbacks: 0,
    weeklySummaries: 0,
    neuronsReminders: 0,
    premiumEndingSoon: 0,
    errors: 0,
  };

  // At most one engagement email per user per day (see
  // ENGAGEMENT_NOTIFICATION_TYPES). Sections below run in priority order
  // -- streak > win-back > daily challenge > neurons -- and each one skips
  // users already in this set and adds the ones it emails. Seeded from the
  // log so a same-day re-run of this cron respects it too.
  const engagedToday = await getRecentlyEngagedUserIds(now);

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
      if (engagedToday.has(user.id)) continue;
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
      engagedToday.add(user.id);

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

  // Today's challenge per language: the daily challenge reminder needs it,
  // and the win-back email (which replaces that reminder on its day)
  // mentions its topic.
  const challengesByLocale = new Map<
    string,
    Awaited<ReturnType<typeof getOrCreateTodaysChallenge>>
  >();
  for (const locale of LOCALES) {
    challengesByLocale.set(locale, await getOrCreateTodaysChallenge(locale, now));
  }

  // --- Win-back ("we miss you") after 7 and 21 days of inactivity ---
  // The DB filter is a deliberately loose prefilter (a day of slack each
  // way); getWinbackStage below makes the exact call on UTC calendar days.
  {
    const recentCutoff = new Date(now.getTime() - 6 * MS_PER_DAY);
    const dormantCutoff = new Date(now.getTime() - 47 * MS_PER_DAY);
    const winbackCandidates = await prisma.user.findMany({
      where: {
        email: { not: null },
        createdAt: { lt: recentCutoff },
        AND: [
          { OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: recentCutoff } }] },
          { OR: [{ lastQuizDate: null }, { lastQuizDate: { lt: recentCutoff } }] },
          {
            OR: [
              { createdAt: { gte: dormantCutoff } },
              { lastSeenAt: { gte: dormantCutoff } },
              { lastQuizDate: { gte: dormantCutoff } },
            ],
          },
        ],
      },
      select: {
        id: true,
        email: true,
        timezone: true,
        level: true,
        neuronsBalance: true,
        longestStreak: true,
        lastSeenAt: true,
        lastQuizDate: true,
        createdAt: true,
        notificationPreference: { select: { winbackEmail: true } },
      },
    });

    for (const user of winbackCandidates) {
      try {
        if (user.notificationPreference?.winbackEmail === false) continue;
        if (!user.email) continue;
        if (engagedToday.has(user.id)) continue;

        const lastActiveAt = getLastActiveAt(user);
        const winback = getWinbackStage(lastActiveAt, now);
        if (!winback) continue;
        if (!isReasonableLocalHour(user.timezone, now, WINBACK_HOUR_WINDOW.min, WINBACK_HOUR_WINDOW.max)) {
          continue;
        }

        const claimed = await tryLogNotification(user.id, "winback", getWinbackDateKey(lastActiveAt, winback.stage));
        if (!claimed) continue;
        engagedToday.add(user.id);

        const locale = await getUserPreferredLocale(user.id);
        const { sent } = await sendEmail({
          to: user.email,
          subject: emailStrings[locale].winback.subject[winback.stage],
          react: (
            <WinbackEmail
              locale={locale}
              appUrl={appUrl}
              daysInactive={winback.daysInactive}
              level={user.level}
              neuronsBalance={user.neuronsBalance}
              longestStreak={user.longestStreak}
              challengeTopic={challengesByLocale.get(locale)?.topic ?? null}
            />
          ),
        });
        if (sent) results.winbacks++;
      } catch (error) {
        console.error("winback email failed for user", user.id, error);
        results.errors++;
      }
    }
  }

  // --- Daily challenge reminders (with friends' results when there are any) ---
  const challengeSocial = await loadDailyChallengeSocialContext(
    [...challengesByLocale.values()].map((challenge) => challenge.id)
  );

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
      if (engagedToday.has(user.id)) continue;
      if (
        !isReasonableLocalHour(user.timezone, now, DAILY_CHALLENGE_HOUR_WINDOW.min, DAILY_CHALLENGE_HOUR_WINDOW.max)
      ) {
        continue;
      }

      const locale = await getUserPreferredLocale(user.id);
      const challenge = challengesByLocale.get(locale);
      if (!challenge) continue;

      if (challengeSocial.hasPlayed(challenge.id, user.id)) continue;

      const dateKey = getUserLocalDateKey(user.timezone, now);
      const claimed = await tryLogNotification(user.id, "daily_challenge_reminder", dateKey);
      if (!claimed) continue;
      engagedToday.add(user.id);

      const strings = emailStrings[locale].dailyChallengeReminder;
      const social = challengeSocial.getSocialProof(challenge.id, user.id);
      const subject =
        social?.kind === "friends"
          ? strings.friendsSubject(
              social.topFriendName,
              social.otherFriendsCount + (social.topFriendName ? 1 : 0)
            )
          : strings.subject;
      const { sent } = await sendEmail({
        to: user.email,
        subject,
        react: (
          <DailyChallengeReminderEmail locale={locale} topic={challenge.topic} appUrl={appUrl} social={social} />
        ),
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

  // --- Weekly "you have N Neurons left" for free users who can't afford a game ---
  // Lowest-priority engagement email: it only goes out on a day nothing
  // else did, and its ISO-week dedupe key means a blocked day just rolls
  // over to the next one in the same week.
  {
    const weekKey = getIsoWeekKey(now);
    const activeCutoff = new Date(now.getTime() - (NEURONS_REMINDER_MAX_INACTIVE_DAYS + 1) * MS_PER_DAY);
    const neuronsCandidates = await prisma.user.findMany({
      where: {
        email: { not: null },
        neuronsBalance: { lt: MIN_NEURON_GAME_COST },
        subscriptionStatus: { not: "pro" },
        OR: [{ lastSeenAt: { gte: activeCutoff } }, { lastQuizDate: { gte: activeCutoff } }],
      },
      select: {
        id: true,
        email: true,
        timezone: true,
        neuronsBalance: true,
        subscriptionStatus: true,
        premiumUntil: true,
        lastSeenAt: true,
        lastQuizDate: true,
        createdAt: true,
        notificationPreference: { select: { neuronsReminderEmail: true } },
      },
    });

    for (const user of neuronsCandidates) {
      try {
        if (user.notificationPreference?.neuronsReminderEmail === false) continue;
        if (!user.email) continue;
        if (engagedToday.has(user.id)) continue;
        // Pro (paid or temporary) plays the Neuron games for free -- nothing to nag about.
        if (isEffectivelyPro(user, now)) continue;
        if (utcDaysBetween(getLastActiveAt(user), now) > NEURONS_REMINDER_MAX_INACTIVE_DAYS) continue;
        if (
          !isReasonableLocalHour(
            user.timezone,
            now,
            NEURONS_REMINDER_HOUR_WINDOW.min,
            NEURONS_REMINDER_HOUR_WINDOW.max
          )
        ) {
          continue;
        }

        const claimed = await tryLogNotification(user.id, "neurons_reminder", weekKey);
        if (!claimed) continue;
        engagedToday.add(user.id);

        const [locale, progress] = await Promise.all([
          getUserPreferredLocale(user.id),
          getNeuronsProgress(prisma, user.id),
        ]);
        const { sent } = await sendEmail({
          to: user.email,
          subject: emailStrings[locale].neuronsReminder.subject(user.neuronsBalance),
          react: (
            <NeuronsReminderEmail
              locale={locale}
              appUrl={appUrl}
              balance={user.neuronsBalance}
              cost={MIN_NEURON_GAME_COST}
              remainingForNext={progress.neededForNext - progress.correctTowardNext}
              reward={NEURONS_PER_BATCH}
            />
          ),
        });
        if (sent) results.neuronsReminders++;
      } catch (error) {
        console.error("neurons reminder failed for user", user.id, error);
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
