// Topics are free text (no fixed category), so there's no reliable way to
// know a quiz is "Geography" other than pattern-matching the topic string
// the user typed. False negatives just mean no globe/country tagging --
// never breaks quiz generation either way.
const GEOGRAPHY_KEYWORDS = [
  // English
  "geography",
  "countries",
  "country",
  "capital",
  "capitals",
  "flags",
  "flag",
  "continents",
  "world map",
  // French
  "géographie",
  "geographie",
  "pays",
  "capitale",
  "capitales",
  "drapeaux",
  "drapeau",
  "continents",
  // Spanish
  "geografía",
  "geografia",
  "países",
  "paises",
  "capital",
  "capitales",
  "banderas",
  "bandera",
  "continentes",
];

export function isGeographyTopic(topic: string): boolean {
  const normalized = topic.trim().toLowerCase();
  return GEOGRAPHY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
