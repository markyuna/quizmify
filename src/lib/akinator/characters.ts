import type { Locale } from "@/i18n/locales";

/**
 * The curated pool the AI draws its secret character from. Ten well-known
 * people/characters spread across categories so the yes/no space stays
 * interesting. Plain object keyed by a stable slug -- "catalog lives in
 * code", same stance as the Akinator `characterKey` column and
 * NeuronTransaction.gameKey.
 */
export const AKINATOR_CHARACTERS = {
  einstein: { category: "historical", names: { en: "Albert Einstein", es: "Albert Einstein", fr: "Albert Einstein" } },
  marilyn: { category: "historical", names: { en: "Marilyn Monroe", es: "Marilyn Monroe", fr: "Marilyn Monroe" } },
  cleopatra: { category: "historical", names: { en: "Cleopatra", es: "Cleopatra", fr: "Cléopâtre" } },
  leonardo: { category: "artist", names: { en: "Leonardo da Vinci", es: "Leonardo da Vinci", fr: "Léonard de Vinci" } },
  bob_marley: { category: "musician", names: { en: "Bob Marley", es: "Bob Marley", fr: "Bob Marley" } },
  freddie_mercury: { category: "musician", names: { en: "Freddie Mercury", es: "Freddie Mercury", fr: "Freddie Mercury" } },
  elon_musk: { category: "contemporary", names: { en: "Elon Musk", es: "Elon Musk", fr: "Elon Musk" } },
  harry_potter: { category: "fiction", names: { en: "Harry Potter", es: "Harry Potter", fr: "Harry Potter" } },
  sherlock: { category: "fiction", names: { en: "Sherlock Holmes", es: "Sherlock Holmes", fr: "Sherlock Holmes" } },
  batman: { category: "fiction", names: { en: "Batman", es: "Batman", fr: "Batman" } },
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
