import { z } from "zod";

import { openai } from "@/lib/openai";
import type { Locale } from "@/i18n/locales";
import { CRUCIGRAMA_WORD_RANGE, type CrucigramaDifficulty } from "@/lib/crucigrama";
import { buildCrossword, type CrosswordLayout } from "./grid";

const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", fr: "French", es: "Spanish" };

const entriesSchema = z.object({
  entries: z
    .array(
      z.object({
        answer: z.string().trim().min(2).max(20),
        clue: z.string().trim().min(3).max(200),
      })
    )
    .min(3),
});

// Same "CRITICAL SCOPE CONSTRAINT" shape as generateQuestionsWithAI /
// api/game/[gameId]/next-batch/route.ts -- keeps a topic pinned to its
// intended meaning instead of drifting to a broader/international reading.
function scopeBlock(
  topic: string,
  categoryName?: string | null,
  countryScope?: string | null
): string {
  if (!categoryName) {
    return `\n\nCRITICAL SCOPE CONSTRAINT: Every entry MUST be directly and unambiguously about "${topic}". If "${topic}" could be read with a broader or international scope, restrict it to the single most common, specific meaning. Do NOT include words that are only loosely associated with it.`;
  }
  return `\n\nCRITICAL SCOPE CONSTRAINT: These words are for the category "${categoryName}"${
    countryScope ? ` (specifically as it applies to ${countryScope})` : ""
  }. Every word MUST be directly related to "${categoryName}"${
    countryScope ? `, in the context of ${countryScope}` : ""
  }. If "${topic}" is ambiguous or could be read with a broader/international scope, restrict it EXCLUSIVELY to what is relevant to "${categoryName}".`;
}

async function requestWords(params: {
  topic: string;
  difficulty: CrucigramaDifficulty;
  language: Locale;
  min: number;
  max: number;
  scope: string;
  avoid: string[];
}): Promise<z.infer<typeof entriesSchema>> {
  const languageName = LANGUAGE_NAMES[params.language];
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [
      {
        role: "developer",
        content: `You generate word lists for a crossword puzzle. Reply with valid JSON only. Every "answer" and every "clue" must be written in ${languageName}.`,
      },
      {
        role: "user",
        content: `Generate between ${params.min} and ${params.max} crossword entries about "${params.topic}" (difficulty: ${params.difficulty}).

Return a JSON object with this exact structure:
{ "entries": [ { "answer": "SingleWord", "clue": "short definition-style clue" } ] }

Rules:
- "answer" is ONE single word, 3 to 12 letters, no spaces, no hyphens, no digits, no abbreviations. Accents and ñ are allowed.
- Never use the ligatures œ or æ.
- "clue" is in ${languageName}, one short phrase, and must NOT contain the answer or an obvious derivative of it.
- Choose words that SHARE MANY COMMON LETTERS with each other -- especially vowels (A, E, I, O) and frequent consonants (R, S, T, N, L) -- so they interlock well in a crossword grid.
- Prefer medium-length words (5-9 letters) over very short or very long ones.
- All answers must be unique.${
          params.avoid.length ? `\n- Do NOT reuse any of these words: ${params.avoid.join(", ")}` : ""
        }${params.scope}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return entriesSchema.parse(JSON.parse(content));
}

export type CrosswordPuzzle = {
  layout: CrosswordLayout;
  words: { number: number; direction: "across" | "down"; clue: string; answer: string }[];
};

/**
 * Content generation (AI) + grid generation (local, deterministic) as two
 * separate steps, with up to 3 regeneration rounds if the AI's words don't
 * interlock into a grid holding at least the difficulty's minimum word count.
 * Returns null if every round fails -- the caller turns that into a 422 and
 * never charges the player.
 */
export async function buildCrosswordPuzzle(params: {
  topic: string;
  topicNormalized: string;
  difficulty: CrucigramaDifficulty;
  language: Locale;
  seed: string;
  categoryName?: string | null;
  countryScope?: string | null;
}): Promise<CrosswordPuzzle | null> {
  const [min, max] = CRUCIGRAMA_WORD_RANGE[params.difficulty];
  const scope = scopeBlock(params.topic, params.categoryName, params.countryScope);
  const maxSize = max + 6; // bounding-box ceiling; the builder rejects seeds that exceed it

  let avoid: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    let parsed: z.infer<typeof entriesSchema>;
    try {
      parsed = await requestWords({
        topic: params.topic,
        difficulty: params.difficulty,
        language: params.language,
        min: Math.min(min + 1, max),
        max: max + 2, // ask a couple extra so the builder can drop 1-2 that won't place
        scope,
        avoid,
      });
    } catch (error) {
      console.error("Crucigrama word generation failed:", error);
      continue;
    }

    const layout = buildCrossword(parsed.entries, {
      maxSize,
      minWords: min,
      attempts: 24,
      seed: `${params.topicNormalized}|${params.language}|${params.difficulty}|${params.seed}|${attempt}`,
    });

    if (layout && layout.entries.length >= min) {
      return {
        layout,
        words: layout.entries.map((e) => ({
          number: e.number,
          direction: e.direction,
          clue: e.clue,
          answer: e.answer,
        })),
      };
    }

    // Regenerate, telling the model to avoid the words that didn't interlock.
    avoid = parsed.entries.map((e) => e.answer);
  }

  return null;
}
