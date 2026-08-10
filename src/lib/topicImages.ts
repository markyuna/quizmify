// Hand-picked background art for a handful of common quiz topics. Real
// topic strings come from whatever guests and users have actually typed
// into QuizCreation (see getPopularTopics in src/lib/topics.ts), so most
// cards will miss this map and fall back to the generic image below --
// this is a cosmetic layer, not a lookup that's expected to always hit.
export const TOPIC_IMAGE_MAP: Record<string, { image: string; accent: string }> = {
  History: {
    image: "https://images.unsplash.com/photo-1507526428915-335fca78af70?w=400&h=300&fit=crop",
    accent: "from-amber-500 to-orange-500",
  },
  Space: {
    image: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=300&fit=crop",
    accent: "from-blue-600 to-indigo-600",
  },
  Math: {
    image: "https://images.unsplash.com/photo-1509909756405-2a2ba530fbb6?w=400&h=300&fit=crop",
    accent: "from-violet-500 to-fuchsia-500",
  },
  Biology: {
    image: "https://images.unsplash.com/photo-1530587191325-3db8b1da4a4d?w=400&h=300&fit=crop",
    accent: "from-green-500 to-emerald-500",
  },
  JavaScript: {
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop",
    accent: "from-yellow-400 to-amber-500",
  },
  Geography: {
    image: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&h=300&fit=crop",
    accent: "from-cyan-500 to-blue-500",
  },
  Movies: {
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=300&fit=crop",
    accent: "from-red-500 to-pink-500",
  },
  Science: {
    image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=300&fit=crop",
    accent: "from-teal-500 to-cyan-500",
  },
};

const FALLBACK_TOPIC_IMAGE = {
  image: "https://images.unsplash.com/photo-1516534775068-bb57e39974b0?w=400&h=300&fit=crop",
  accent: "from-slate-500 to-slate-600",
};

export function getTopicImage(topic: string) {
  return TOPIC_IMAGE_MAP[topic] ?? FALLBACK_TOPIC_IMAGE;
}
