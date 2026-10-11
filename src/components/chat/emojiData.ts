// Curated set for the chat's emoji picker: small on purpose (no dependency,
// no emoji database). Category labels are i18n keys under Chat.emojiCategory.*
export const EMOJI_CATEGORIES = [
  {
    key: "smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🙂", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘",
      "😋", "😜", "🤪", "🤔", "🤨", "😐", "😏", "😒", "🙄", "😌", "😔", "😴", "🤯", "😎", "🤓", "🥳",
      "😢", "😭", "😤", "😡", "🥺", "😱", "😬", "🤗",
    ],
  },
  {
    key: "gestures",
    emojis: [
      "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "👏", "🙌", "🙏", "💪", "👋", "🤝", "☝️", "👉", "👈",
      "🫶", "🤙", "✍️", "🫡",
    ],
  },
  {
    key: "hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️", "💕", "💖", "💯", "✨", "🔥", "⭐"],
  },
  {
    key: "animals",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🦊", "🐻", "🐼", "🦁", "🐯", "🐸", "🐵", "🐧", "🦉", "🐺", "🐬", "🦄",
    ],
  },
  {
    key: "food",
    emojis: ["🍎", "🍌", "🍇", "🍓", "🍕", "🍔", "🍟", "🌮", "🍿", "🍩", "🍪", "🎂", "☕", "🍺", "🍷", "🥂"],
  },
  {
    key: "activities",
    emojis: [
      "⚽", "🏀", "🎮", "🎯", "🎲", "🧩", "🎉", "🎊", "🏆", "🥇", "🎵", "🎧", "📚", "🧠", "💡", "🚀",
    ],
  },
] as const;

export type EmojiCategoryKey = (typeof EMOJI_CATEGORIES)[number]["key"];
