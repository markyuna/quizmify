// Publish-time filter for CategoryTopic (see src/app/api/quiz/submit/route.ts)
// -- never blocks playing a topic, only whether it becomes visible in the
// public category catalog. Deliberately silent on rejection (see
// isTopicAllowed's caller): revealing the list or showing an error would
// just teach people to route around it. French list first since that's the
// current audience (see CLAUDE.md); extend FORBIDDEN_WORDS as new terms
// surface rather than trying to be exhaustive up front.
const FORBIDDEN_WORDS: string[] = [
  // Insultes courantes
  "connard",
  "connasse",
  "salope",
  "pute",
  "putain",
  "encule",
  "enculé",
  "enculee",
  "enculée",
  "batard",
  "bâtard",
  "merde",
  "fdp",
  "ntm",
  "nique ta mere",
  "nique ta mère",
  "fils de pute",
  // Contenu sexuel explicite
  "porno",
  "pornographie",
  "xxx",
  "sexe explicite",
  "penis",
  "pénis",
  "vagin",
  // Incitation à la haine / discrimination
  "nazi",
  "hitler",
  "negre",
  "nègre",
  "bougnoule",
  "youpin",
  "sale arabe",
  "sale noir",
  "sale juif",
];

/**
 * Lowercases and strips accents so "Connard", "connàrd", "CONNARD" all match
 * the same list entry -- separate from normalizeTopic() in
 * questionGeneration.ts, which deliberately preserves case/accents for the
 * CategoryTopic dedup key.
 */
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function foldText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS, "");
}

/**
 * true if `topic` is safe to publish into the public category catalog.
 * Matches whole forbidden phrases (and simple space/hyphen variants) against
 * the folded topic text -- a substring check, so "putaindegeographie" is
 * still caught. Called only at CategoryTopic-creation time; never blocks
 * playing a topic, and a false result should fail silently (no error, no
 * hint that a filter exists).
 */
export function isTopicAllowed(topic: string): boolean {
  const folded = foldText(topic).replace(/[-_]+/g, " ");

  return !FORBIDDEN_WORDS.some((word) => {
    const foldedWord = foldText(word).replace(/[-_]+/g, " ");
    return folded.includes(foldedWord);
  });
}
