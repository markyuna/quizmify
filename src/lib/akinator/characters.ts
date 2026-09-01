import type { Locale } from "@/i18n/locales";

/**
 * The curated pool the AI draws its secret character from. Ten well-known
 * people/characters spread across categories so the yes/no space stays
 * interesting. Plain object keyed by a stable slug -- "catalog lives in
 * code", same stance as the Akinator `characterKey` column and
 * NeuronTransaction.gameKey. Each slug also names the portrait file in the
 * public "akinator-images" Supabase Storage bucket (see getImageUrl).
 */
export const AKINATOR_CHARACTERS = {
  bob_marley: { category: "musician", names: { en: "Bob Marley", es: "Bob Marley", fr: "Bob Marley" } },
  cleopatra: { category: "historical_figure", names: { en: "Cleopatra", es: "Cleopatra", fr: "Cléopâtre" } },
  dracula: { category: "fictional_character", names: { en: "Dracula", es: "Drácula", fr: "Dracula" } },
  einstein: { category: "scientist", names: { en: "Albert Einstein", es: "Albert Einstein", fr: "Albert Einstein" } },
  frida_kahlo: { category: "artist", names: { en: "Frida Kahlo", es: "Frida Kahlo", fr: "Frida Kahlo" } },
  leonardo_da_vinci: {
    category: "artist",
    names: { en: "Leonardo da Vinci", es: "Leonardo da Vinci", fr: "Léonard de Vinci" },
  },
  marie_curie: { category: "scientist", names: { en: "Marie Curie", es: "Marie Curie", fr: "Marie Curie" } },
  marilyn: { category: "actress", names: { en: "Marilyn Monroe", es: "Marilyn Monroe", fr: "Marilyn Monroe" } },
  robin_hood: { category: "legendary_outlaw", names: { en: "Robin Hood", es: "Robin Hood", fr: "Robin des Bois" } },
  zorro: { category: "vigilante", names: { en: "Zorro", es: "El Zorro", fr: "Zorro" } },
} as const;

export type AkinatorCharacterKey = keyof typeof AKINATOR_CHARACTERS;

export function isAkinatorCharacterKey(value: string): value is AkinatorCharacterKey {
  return value in AKINATOR_CHARACTERS;
}

export function getRandomCharacterKey(): AkinatorCharacterKey {
  const keys = Object.keys(AKINATOR_CHARACTERS) as AkinatorCharacterKey[];
  return keys[Math.floor(Math.random() * keys.length)];
}

/** Localised display name; returns the raw key for an unknown character. */
export function getCharacterName(key: string, locale: Locale): string {
  const entry = AKINATOR_CHARACTERS[key as AkinatorCharacterKey];
  return entry ? entry.names[locale] : key;
}

/** All names + the slug, for the local guess-matching fast path. */
export function getCharacterAliases(key: string): string[] {
  const entry = AKINATOR_CHARACTERS[key as AkinatorCharacterKey];
  if (!entry) return [key];
  return [key, ...Object.values(entry.names)];
}

/**
 * Public URL of the character's portrait in the "akinator-images" Supabase
 * Storage bucket -- `<characterKey>.webp`, same host + `/storage/v1/object/
 * public/` pathname the other *ImageStorage helpers use (whitelisted in
 * next.config.ts). The play page reveals it progressively via getBlurLevel.
 */
export function getImageUrl(characterKey: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return `${baseUrl}/storage/v1/object/public/akinator-images/${characterKey}.webp`;
}

/** Blur radius (px) for the reveal image -- clears one step every 5 questions. */
export function getBlurLevel(questionsAsked: number): number {
  if (questionsAsked <= 5) return 80;
  if (questionsAsked <= 10) return 50;
  if (questionsAsked <= 15) return 20;
  return 0;
}
