import type { ChatFriendContact } from "@/lib/chat";
import { formatRelativeTime } from "@/lib/relativeTime";

function capitalize(text: string, locale: string): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/** Local-calendar day (the viewer's time zone), for grouping messages. */
export function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatMessageTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/**
 * Day separator: "today" / "yesterday" via RelativeTimeFormat
 * (numeric: "auto"), a full date otherwise -- Intl only, no i18n keys.
 * `nowIso` is the server clock (serverNow). Math.round absorbs the 23/25 h
 * days around DST changes.
 */
export function formatDayLabel(iso: string, nowIso: string, locale: string): string {
  const date = new Date(iso);
  const now = new Date(nowIso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (diffDays === 0 || diffDays === 1) {
    return capitalize(new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-diffDays, "day"), locale);
  }
  return capitalize(
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}),
    }).format(date),
    locale
  );
}

export type Presence = { key: "online" } | { key: "lastSeen"; time: string } | { key: "offline" };

/** Shared by the friends list and the conversation header. */
export function describePresence(friend: ChatFriendContact, serverNow: string | null, locale: string): Presence {
  if (friend.online) return { key: "online" };
  if (friend.lastSeenAt && serverNow) {
    return { key: "lastSeen", time: formatRelativeTime(friend.lastSeenAt, serverNow, locale) };
  }
  return { key: "offline" };
}
