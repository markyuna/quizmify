import { z } from "zod";

import { openai } from "@/lib/openai";
import type { Locale } from "@/i18n/locales";
import { normalizeTopic, normalizeDifficulty, type Difficulty } from "@/lib/topicUtils";

// Re-exported for every existing importer of these from this module (routes,
// questionSourcing.ts, etc.) -- the canonical definitions live in
// topicUtils.ts now, see the comment there for why.
export { normalizeTopic, normalizeDifficulty };
export type { Difficulty };

export type GeneratedQuestion = {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  country: string | null;
};

export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

const generatedQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(4).max(4),
        correct_answer: z.string().min(1),
        explanation: z.string().min(1),
        country: z.string().min(1).nullable().optional(),
      })
    )
    .min(1),
});

export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
  }

  return result;
}

export function ensureValidOptions(options: string[], correctAnswer: string): string[] {
  const normalizedCorrectAnswer = correctAnswer.trim();

  const sanitizedOptions = options
    .map((option) => option.trim())
    .filter((option) => option.length > 0);

  const uniqueOptions = Array.from(new Set(sanitizedOptions));

  if (!uniqueOptions.includes(normalizedCorrectAnswer)) {
    uniqueOptions.unshift(normalizedCorrectAnswer);
  }

  const finalOptions = Array.from(new Set(uniqueOptions)).slice(0, 4);

  while (finalOptions.length < 4) {
    finalOptions.push(`Option ${finalOptions.length + 1}`);
  }

  if (!finalOptions.includes(normalizedCorrectAnswer)) {
    finalOptions[0] = normalizedCorrectAnswer;
  }

  return shuffleArray(finalOptions);
}

export function dedupeQuestions<T extends { question: string }>(questions: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const q of questions) {
    const key = q.question.trim().toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      result.push(q);
    }
  }

  return result;
}

export async function generateQuestionsWithAI(params: {
  topic: string;
  difficulty: Difficulty;
  language: Locale;
  amount: number;
  isGeography: boolean;
  /** Parent category display name (already localized), if the topic was created/played under one. */
  categoryName?: string | null;
  /** Questions already in the cache -- the model is told not to repeat them. */
  existingQuestions?: string[];
}): Promise<GeneratedQuestion[]> {
  const { topic, difficulty, language, amount, isGeography, categoryName = null, existingQuestions = [] } = params;
  const languageName = LANGUAGE_NAMES[language];

  const categoryScopeBlock = categoryName
    ? `\n\nCRITICAL SCOPE CONSTRAINT: These questions are for the category "${categoryName}". Every question MUST be directly related to "${categoryName}". If "${topic}" is ambiguous or could be read with a broader/international scope (e.g. "rivers" meaning rivers anywhere in the world), restrict it EXCLUSIVELY to what is relevant to "${categoryName}" (e.g. rivers located in or otherwise relevant to ${categoryName}). Do NOT generate questions about anything outside that context, even if factually valid in general terms.`
    : "";

  // Cap the avoid-list so the prompt stays small.
  const avoidList = existingQuestions.slice(0, 60);
  const avoidBlock =
    avoidList.length > 0
      ? `\n\n**CRITICAL: Do NOT repeat, rephrase, or closely paraphrase ANY of these existing questions:**\n${avoidList
          .map((q, i) => `${i + 1}. ${q}`)
          .join("\n")}\n\nEach generated question MUST be completely different from all the above.`
      : "";

  const countryField = isGeography
    ? `,\n      "country": "string or null -- the real-world country (in English, e.g. \\"France\\", \\"Japan\\") this specific question is about, or null if it isn't about a specific country"`
    : "";

  const countryRule = isGeography
    ? "\n- if the question is about a specific country, city, or place, set \"country\" to that country's name in English; otherwise set it to null"
    : "";

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [
      {
        role: "developer",
        content: `You are a quiz question generator. Generate high-quality, diverse multiple-choice quiz questions entirely in ${languageName}. Return only valid JSON.

CRITICAL RULES:
1. Each question must have exactly 4 options and exactly 1 correct answer
2. Each of the ${amount} questions MUST be COMPLETELY UNIQUE - NO DUPLICATES ALLOWED
3. Each question must ask about a DIFFERENT aspect of the topic
4. Do NOT repeat, rephrase, or reword any similar questions`,
      },
      {
        role: "user",
        content: `Generate ${amount} UNIQUE multiple-choice quiz questions about "${topic}" with difficulty "${difficulty}".

IMPORTANT: Make sure ALL ${amount} questions are COMPLETELY DIFFERENT from each other. Each question should ask about a different aspect, angle, or detail of "${topic}".

Write the question, options, and explanation entirely in ${languageName}.

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_answer": "string",
      "explanation": "string"${countryField}
    }
  ]
}

Rules:
- exactly 4 options per question
- exactly 1 correct answer
- the correct answer must appear in options
- concise and clear ${languageName}
- no markdown
- no extra text
- ALL questions must be unique and non-repetitive${countryRule}${categoryScopeBlock}${avoidBlock}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  const parsedJson = JSON.parse(content);
  const parsed = generatedQuestionsSchema.parse(parsedJson);

  const questions = parsed.questions.map((q) => ({
    question: q.question.trim(),
    options: ensureValidOptions(q.options, q.correct_answer),
    correct_answer: q.correct_answer.trim(),
    explanation: q.explanation.trim(),
    country: q.country?.trim() || null,
  }));

  // Validate that all generated questions are unique
  const uniqueQuestions = dedupeQuestions(questions);
  if (uniqueQuestions.length < questions.length) {
    console.warn(
      `⚠️ AI generated ${questions.length} questions but ${uniqueQuestions.length} are unique. ` +
        `Duplicates detected and removed. Requesting regeneration of ${questions.length - uniqueQuestions.length} questions.`
    );

    // If we lost questions to deduplication, regenerate the missing ones
    const missingCount = questions.length - uniqueQuestions.length;
    const existingAndGenerated = [...existingQuestions, ...uniqueQuestions.map(q => q.question)];

    try {
      const additionalQuestions = await generateQuestionsWithAI({
        topic,
        difficulty,
        language,
        amount: missingCount,
        isGeography,
        categoryName,
        existingQuestions: existingAndGenerated,
      });
      return [...uniqueQuestions, ...additionalQuestions];
    } catch (error) {
      console.error("Failed to regenerate missing questions:", error);
      return uniqueQuestions;
    }
  }

  return questions;
}
