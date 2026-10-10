/**
 * Per-tab marker for "this game was already submitted", read by
 * FinishedQuizGuard. Needed on top of the server-side `timeEnded` redirect in
 * /play/mcq and /play/kahoot because browser back/forward reuses the page's
 * cached RSC payload from the client cache without a server round-trip -- so
 * after finishing a quiz and visiting /statistics, "Back" would otherwise
 * remount the play component from that stale payload, at question 1.
 *
 * sessionStorage is enough: the cache it works around is per-tab too, and a
 * fresh load always goes through the server redirect. Best-effort -- storage
 * can throw (private mode, blocked site data), in which case this no-ops.
 */
const KEY_PREFIX = "quizmify:quiz-finished:";

export function markQuizFinished(gameId: string): void {
  try {
    sessionStorage.setItem(KEY_PREFIX + gameId, "1");
  } catch {
    // Storage unavailable -- the server-side redirect still covers reloads.
  }
}

export function isQuizMarkedFinished(gameId: string): boolean {
  try {
    return sessionStorage.getItem(KEY_PREFIX + gameId) === "1";
  } catch {
    return false;
  }
}
