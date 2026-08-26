// Accent gradient shown behind a topic card that has no resolved category
// (see TopicCarousel.tsx). Topic strings come from whatever guests and
// users have actually typed into QuizCreation, so most cards will miss this
// map and fall back to the generic gradient below -- this is a cosmetic
// layer, not a lookup that's expected to always hit.
//
// Used to pair each entry with a hardcoded Unsplash photo instead of just a
// gradient, but several of those URLs started 404ing (confirmed 2026-08-26,
// including the generic fallback photo -- the one every uncategorized topic
// depended on). Dropped image URLs entirely rather than swapping in new
// ones: a plain gradient can't go stale the same way a third-party CDN link
// can.
export const TOPIC_ACCENT_MAP: Record<string, string> = {
  History: "from-amber-500 to-orange-500",
  Space: "from-blue-600 to-indigo-600",
  Math: "from-violet-500 to-fuchsia-500",
  Biology: "from-green-500 to-emerald-500",
  JavaScript: "from-yellow-400 to-amber-500",
  Geography: "from-cyan-500 to-blue-500",
  Movies: "from-red-500 to-pink-500",
  Science: "from-teal-500 to-cyan-500",
};

const FALLBACK_ACCENT = "from-slate-500 to-slate-600";

export function getTopicAccent(topic: string): string {
  return TOPIC_ACCENT_MAP[topic] ?? FALLBACK_ACCENT;
}
