import { prisma } from "@/lib/db";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/locales";

/**
 * Best-effort locale for a user outside of any request context (cron jobs
 * have no cookies/headers to read). Infers it from the language of their
 * most recently played game, since we don't store an explicit language
 * preference on User. Falls back to the app default.
 */
export async function getUserPreferredLocale(userId: string): Promise<Locale> {
  const lastGame = await prisma.game.findFirst({
    where: { userId },
    orderBy: { timeStarted: "desc" },
    select: { language: true },
  });

  const candidate = lastGame?.language;
  return LOCALES.includes(candidate as Locale) ? (candidate as Locale) : DEFAULT_LOCALE;
}

/** User's current local hour (0-23) in their stored IANA timezone. */
function getLocalHour(timezone: string, now: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).format(now);
  return parseInt(formatted, 10) % 24;
}

/**
 * Courtesy gate for a once-daily, fixed-UTC-time cron: skip sending to
 * users for whom right now would land at an unreasonable local hour (e.g.
 * 3am). Users with no stored timezone yet (haven't logged in since this
 * shipped) are always allowed through rather than silently never reached.
 */
export function isReasonableLocalHour(
  timezone: string | null,
  now: Date,
  minHour: number,
  maxHour: number
): boolean {
  if (!timezone) return true;

  try {
    const hour = getLocalHour(timezone, now);
    return hour >= minHour && hour <= maxHour;
  } catch {
    // Invalid/unrecognized IANA string -- don't let a bad value block sending.
    return true;
  }
}

/** User's local calendar date ("YYYY-MM-DD") in their stored timezone. */
export function getUserLocalDateKey(timezone: string | null, now: Date): string {
  if (!timezone) return now.toISOString().slice(0, 10);

  try {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return formatted; // en-CA formats as YYYY-MM-DD
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** ISO week key ("YYYY-Www"), used as the weekly_summary dedupe key. */
export function getIsoWeekKey(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function toUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Whole UTC calendar days between two dates -- matches src/lib/streak.ts's definition of "today". */
export function utcDaysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((toUtcDayStart(to).getTime() - toUtcDayStart(from).getTime()) / MS_PER_DAY);
}

/**
 * Records that a notification was sent, guarded by the
 * @@unique([userId, type, dateKey]) constraint -- this is the real
 * duplicate guard, not any check that precedes it. Returns false (without
 * throwing) if it was already logged for this key.
 */
export async function tryLogNotification(
  userId: string,
  type: "streak_reminder" | "daily_challenge_reminder" | "weekly_summary" | "premium_ending_soon",
  dateKey: string
): Promise<boolean> {
  try {
    await prisma.notificationLog.create({ data: { userId, type, dateKey } });
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return false;
    }
    throw error;
  }
}
