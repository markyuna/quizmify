import { openai } from "@/lib/openai";
import type { Locale } from "@/i18n/locales";
import { getCharacterAliases } from "./characters";

export type Verdict = "yes" | "no" | "partial";

export type AkinatorTurn = {
  question: string;
  verdict: Verdict;
  explanation: string;
};

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

const LANGUAGE_NAME: Record<Locale, string> = { en: "English", fr: "French", es: "Spanish" };

const VERDICTS: Verdict[] = ["yes", "no", "partial"];

function coerceVerdict(value: unknown): Verdict {
  return typeof value === "string" && (VERDICTS as string[]).includes(value) ? (value as Verdict) : "partial";
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Answers one yes/no question about the secret character. JSON mode, low
 * temperature for consistency. The character name is only ever in the
 * system prompt -- the rules forbid leaking it.
 */
export async function answerQuestion(params: {
  characterName: string;
  priorTurns: AkinatorTurn[];
  question: string;
  locale: Locale;
}): Promise<{ verdict: Verdict; explanation: string }> {
  const language = LANGUAGE_NAME[params.locale];

  const system = [
    `You are the answerer in a "20 questions" game. Your secret character is: ${params.characterName}.`,
    `The player asks yes/no questions to work out who it is. Reply to each question as JSON:`,
    `{"verdict": "yes" | "no" | "partial", "explanation": "<one short sentence>"}`,
    `- Be strictly consistent with ${params.characterName}. Use "partial" when a fact is roughly true, disputed, or not clearly applicable.`,
    `- Write "explanation" in ${language}, one sentence, at most ~20 words. Do not restate the question.`,
    `- NEVER reveal, spell, or hint at the character's name, initials, or letters of the name, even if asked directly. If the player asks for the name, reply verdict "no" with an explanation that they have to guess.`,
  ].join("\n");

  const messages = [
    { role: "system" as const, content: system },
    ...params.priorTurns.flatMap((turn) => [
      { role: "user" as const, content: turn.question },
      {
        role: "assistant" as const,
        content: JSON.stringify({ verdict: turn.verdict, explanation: turn.explanation }),
      },
    ]),
    { role: "user" as const, content: params.question },
  ];

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 200,
  });

  let parsed: { verdict?: unknown; explanation?: unknown } = {};
  try {
    parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  } catch {
    // fall through to defaults
  }

  return {
    verdict: coerceVerdict(parsed.verdict),
    explanation: typeof parsed.explanation === "string" && parsed.explanation.trim() ? parsed.explanation.trim() : "",
  };
}

/**
 * Is `guess` the secret character? Local normalise-and-compare first (exact
 * name, slug, or a long substring), then one cheap OpenAI call for
 * nicknames / alternate spellings / cross-language matches.
 */
export async function validateGuess(characterKey: string, guess: string, canonicalName: string): Promise<boolean> {
  const normalisedGuess = normalise(guess);
  if (normalisedGuess.length < 2) return false;

  const aliases = getCharacterAliases(characterKey).map(normalise);
  if (
    aliases.some(
      (alias) => alias === normalisedGuess || (normalisedGuess.length >= 4 && alias.includes(normalisedGuess))
    )
  ) {
    return true;
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content:
            `Does the guess "${guess}" refer to ${canonicalName}? ` +
            `Consider nicknames, alternate spellings, and other languages. ` +
            `Answer as JSON: {"match": true | false}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 20,
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return parsed.match === true;
  } catch (error) {
    console.error("Akinator validateGuess fallback failed:", error);
    return false;
  }
}
