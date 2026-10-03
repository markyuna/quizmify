/**
 * Presence timings for the friends "online"/"last seen" indicator.
 *
 * - PRESENCE_HEARTBEAT_INTERVAL_MS: how often PresenceProvider pings the
 *   server while a tab is visible.
 * - PRESENCE_WRITE_THROTTLE_MS: the minimum gap the server enforces between
 *   actual DB writes for a given user (< heartbeat interval, so a normal
 *   single-tab heartbeat always clears it -- it exists to absorb bursts from
 *   multiple open tabs/an immediate heartbeat right after a visibility
 *   change, not to skip routine pings). Kept deliberately below prod-DB
 *   write-frequency caution levels (see CLAUDE.md: local dev and scripts hit
 *   the same shared Supabase instance as production).
 * - PRESENCE_ONLINE_WINDOW_MS: how stale lastSeenAt can be and still count
 *   as "online". Set well above the heartbeat interval to tolerate a missed
 *   beat or two (backgrounded tab, brief network hiccup) without flickering
 *   to "last seen" and back.
 */
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 60_000;
export const PRESENCE_WRITE_THROTTLE_MS = 45_000;
export const PRESENCE_ONLINE_WINDOW_MS = 180_000;

/**
 * Pure: true if `lastSeenAt` is recent enough to show as "online" right now.
 * Takes `now` explicitly (rather than reading the clock itself) so callers
 * -- both server code and the client, which renders off `serverNow` from
 * the API response instead of its own clock -- get a deterministic result.
 */
export function isOnline(lastSeenAt: Date | null, now: Date): boolean {
  if (!lastSeenAt) return false;
  return now.getTime() - lastSeenAt.getTime() <= PRESENCE_ONLINE_WINDOW_MS;
}
