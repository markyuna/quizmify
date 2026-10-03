/**
 * Formats the gap between `fromIso` and `nowIso` as a localized relative
 * phrase ("hace 5 minutos" / "il y a 5 minutes" / "5 minutes ago").
 * Extracted from FriendsManager.tsx's original formatLastSeen (Phase 3) --
 * identical behavior, more generic name now that NotificationBell.tsx also
 * needs it. No existing "time ago" helper existed in the repo when this was
 * first written (only date-fns' differenceInSeconds, used for quiz timers,
 * not relative-past phrasing), hence Intl.RelativeTimeFormat rather than a
 * new dependency.
 */
export function formatRelativeTime(fromIso: string, nowIso: string, locale: string): string {
  const diffMs = new Date(nowIso).getTime() - new Date(fromIso).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffMinutes < 60) return rtf.format(-diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return rtf.format(-diffHours, "hour");
  return rtf.format(-Math.round(diffHours / 24), "day");
}
