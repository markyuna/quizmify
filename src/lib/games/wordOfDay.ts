import type { Locale } from "@/i18n/locales";
import { GuestGameKey, registerGuestGame } from "@/lib/guestPlay";

export const MAX_WORD_GUESSES = 6;
const MIN_WORD_LENGTH = 6;
const MAX_WORD_LENGTH = 8;

// Small curated rotation, same idiom as DAILY_CHALLENGE_TOPICS in
// dailyChallenge.ts -- a hash of the date picks a word deterministically so
// every guest sees the same word on the same day without needing storage
// for "today's pick." All entries are verified 6-8 letters long (by
// normalized/base-letter count, so accents don't shift that).
const WORD_LISTS: Record<Locale, readonly string[]> = {
  en: [
    "GARDEN", "PLANET", "ORANGE", "YELLOW", "WINDOW", "MARKET", "SILVER", "GOLDEN",
    "FRIEND", "ANIMAL", "FOREST", "ISLAND", "FLOWER", "BRIDGE", "CASTLE", "DRAGON",
    "PUZZLE", "RABBIT", "SUMMER", "WINTER", "AUTUMN", "COFFEE", "CAMERA", "PENCIL",
    "ROCKET", "TURTLE", "JOURNEY", "PICTURE", "STUDENT", "MORNING", "SPARROW",
    "MOUNTAIN", "ELEPHANT", "SANDWICH", "BASEBALL", "FOOTBALL", "KEYBOARD",
  ],
  fr: [
    "JARDIN", "MAISON", "VOITURE", "MONTAGNE", "CHÂTEAU", "DRAGON", "TORTUE", "AUTOMNE",
    "CRAYON", "SOLEIL", "RIVIÈRE", "VILLAGE", "GARÇON", "VOYAGE", "ÉTUDIANT", "MOINEAU",
    "CLAVIER", "SANDWICH", "FOOTBALL", "ÉLÉPHANT", "FENÊTRE", "MARCHÉ", "ARGENT",
    "ANIMAL", "APPAREIL", "TABLEAU", "MATINÉE", "PUZZLE", "ORANGE", "BASEBALL",
  ],
  es: [
    "JARDÍN", "VENTANA", "MONTAÑA", "TORTUGA", "DRAGÓN", "CONEJO", "VERANO", "INVIERNO",
    "CÁMARA", "COHETE", "ALUMNO", "MAÑANA", "GORRIÓN", "TECLADO", "ELEFANTE", "CASTILLO",
    "NARANJA", "AMARILLO", "MERCADO", "PLATEADO", "DORADO", "ANIMAL", "BOSQUE", "PUENTE",
    "TRAYECTO", "IMAGEN", "SÁNDWICH", "FÚTBOL", "BÉISBOL",
  ],
};

/** Strips diacritics and upcases, so ÉLÉPHANT/eléphant/elephant all compare equal. */
export function normalizeWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

function pickWordForDate(dateKey: string, language: Locale): string {
  const words = WORD_LISTS[language] ?? WORD_LISTS.en;
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return words[hash % words.length];
}

// Guards the 6-8 letter invariant the daily word length UI relies on --
// catches a typo'd word list entry at import time instead of at whatever
// hour of the day that entry happens to get picked.
if (process.env.NODE_ENV !== "production") {
  for (const words of Object.values(WORD_LISTS)) {
    for (const word of words) {
      const length = normalizeWord(word).length;
      if (length < MIN_WORD_LENGTH || length > MAX_WORD_LENGTH) {
        throw new Error(`wordOfDay: "${word}" is ${length} letters, expected ${MIN_WORD_LENGTH}-${MAX_WORD_LENGTH}`);
      }
    }
  }
}

export type LetterStatus = "correct" | "present" | "absent";

/**
 * Standard Wordle-style scoring: exact-position matches first, then
 * leftover letters matched against however many of that letter remain
 * unmatched in the target (so a repeated letter in the guess doesn't score
 * "present" more times than it actually occurs). Comparison is on
 * normalized (accent-stripped) letters -- a guest without an accented
 * keyboard can still play.
 */
export function scoreGuess(target: string, guess: string): LetterStatus[] {
  const targetLetters = [...normalizeWord(target)];
  const guessLetters = [...normalizeWord(guess)];
  const result: LetterStatus[] = new Array(guessLetters.length).fill("absent");
  const remaining: Record<string, number> = {};

  guessLetters.forEach((letter, i) => {
    if (letter === targetLetters[i]) {
      result[i] = "correct";
    } else {
      remaining[targetLetters[i]] = (remaining[targetLetters[i]] ?? 0) + 1;
    }
  });

  guessLetters.forEach((letter, i) => {
    if (result[i] === "correct") return;
    if ((remaining[letter] ?? 0) > 0) {
      result[i] = "present";
      remaining[letter] -= 1;
    }
  });

  return result;
}

type WordOfDayPayload = { word: string };
type WordOfDayAnswer = { guesses: string[] };

registerGuestGame({
  gameKey: GuestGameKey.word_of_day,

  generateChallenge(dateKey, language): WordOfDayPayload {
    return { word: pickWordForDate(dateKey, language) };
  },

  // The target word itself never reaches the client here -- only its
  // length. Live per-guess feedback is served separately by
  // /api/guest/word_of_day/guess, which looks the word up server-side.
  toClientChallenge(payload) {
    const { word } = payload as WordOfDayPayload;
    return { wordLength: normalizeWord(word).length, maxGuesses: MAX_WORD_GUESSES };
  },

  // Runs once, at round end: the client sends the full ordered list of
  // guesses it already played (and already saw live feedback for via the
  // guess endpoint) so the final result can be persisted and graded from
  // the authoritative target -- the client's own read of "did I win" is
  // never trusted for XP purposes.
  grade(payload, answer) {
    const { word } = payload as WordOfDayPayload;
    const { guesses } = answer as WordOfDayAnswer;

    const normalizedTarget = normalizeWord(word);
    const validGuesses = Array.isArray(guesses)
      ? guesses
          .filter((g): g is string => typeof g === "string")
          .slice(0, MAX_WORD_GUESSES)
          .filter((g) => normalizeWord(g).length === normalizedTarget.length)
      : [];

    const won = validGuesses.some((g) => normalizeWord(g) === normalizedTarget);
    const feedbackHistory = validGuesses.map((g) => scoreGuess(word, g));

    return {
      isCorrect: won,
      resultPayload: { word, guesses: validGuesses, feedbackHistory, won },
    };
  },
});
