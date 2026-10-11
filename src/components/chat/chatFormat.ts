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

// Pictographs, skin tones, ZWJ / variation selectors (composed emojis) and flags.
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200d|\ufe0f|\s)+$/u;
const EMOJI_ONLY_MAX = 3;

/** A short message made only of emojis (up to 3): shown larger, like most chat apps. */
export function isEmojiOnly(body: string): boolean {
  const text = body.trim();
  if (!text || !EMOJI_ONLY.test(text)) return false;
  if (typeof Intl.Segmenter === "undefined") return false;
  let count = 0;
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)) {
    if (segment.trim()) count += 1;
    if (count > EMOJI_ONLY_MAX) return false;
  }
  return count > 0;
}

/** Whether my message was read: the other side opened the conversation at or after it was sent. */
export function isReadBy(createdAt: string, otherLastReadAt: string | null): boolean {
  return otherLastReadAt !== null && new Date(createdAt).getTime() <= new Date(otherLastReadAt).getTime();
}
