// Client-only bridge for the category chosen in QuizCreation to reach
// /api/quiz/submit later, from a different page (/play/mcq/[gameId] or
// /play/kahoot/[gameId]) after a full navigation. Deliberately not a field
// on Game: the restriction on this phase was to touch only the point where
// a Game is marked finished (see CategoryTopic in prisma/schema.prisma),
// not game creation. sessionStorage (not a cookie) is enough since this
// only needs to survive the same-tab creation -> play -> submit hop, never
// a guest's registration gap -- guests never reach /api/quiz/submit at all.
const KEY_PREFIX = "quizmify_category_";

export function setSessionCategoryForGame(gameId: string, categorySlug: string) {
  try {
    sessionStorage.setItem(KEY_PREFIX + gameId, categorySlug);
  } catch {
    // Some privacy modes throw on storage access -- non-fatal, the topic
    // just won't get published to the category catalog.
  }
}

export function consumeSessionCategoryForGame(gameId: string): string | null {
  try {
    const key = KEY_PREFIX + gameId;
    const value = sessionStorage.getItem(key);
    if (value) sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}
