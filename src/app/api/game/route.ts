import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { quizCreationSchema } from "@/schemas/form/quiz";

type Difficulty = "easy" | "medium" | "hard";

type SupabaseMCQQuestion = {
  id: string;
  topic: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
};

type GeneratedQuestion = {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
};

const generatedQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(4).max(4),
        correct_answer: z.string().min(1),
        explanation: z.string().min(1),
      })
    )
    .min(1),
});

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

function normalizeTopic(topic: string): string {
  return topic.trim().replace(/\s+/g, " ");
}

function normalizeDifficulty(difficulty: Difficulty): Difficulty {
  return difficulty.toLowerCase() as Difficulty;
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
  }

  return result;
}

function ensureValidOptions(options: string[], correctAnswer: string): string[] {
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

function dedupeQuestions<T extends { question: string }>(questions: T[]): T[] {
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

async function fetchExistingMCQQuestions(params: {
  topic: string;
  difficulty: Difficulty;
  amount: number;
}): Promise<SupabaseMCQQuestion[]> {
  const { topic, difficulty, amount } = params;

  const { data, error } = await supabaseAdmin
    .from("mcq_questions")
    .select("*")
    .ilike("topic", topic)
    .eq("difficulty", difficulty)
    .eq("is_active", true)
    .order("usage_count", { ascending: true })
    .limit(amount);

  if (error) {
    throw new Error(`Supabase fetch error: ${error.message}`);
  }

  return (data ?? []) as SupabaseMCQQuestion[];
}

async function generateQuestionsWithAI(params: {
  topic: string;
  difficulty: Difficulty;
  amount: number;
}): Promise<GeneratedQuestion[]> {
  const { topic, difficulty, amount } = params;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [
      {
        role: "developer",
        content:
          "Generate high-quality multiple-choice quiz questions. Return only valid JSON. Each question must have exactly 4 options and exactly 1 correct answer. Avoid duplicates.",
      },
      {
        role: "user",
        content: `Generate ${amount} multiple-choice quiz questions about "${topic}" with difficulty "${difficulty}".

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_answer": "string",
      "explanation": "string"
    }
  ]
}

Rules:
- exactly 4 options per question
- exactly 1 correct answer
- the correct answer must appear in options
- concise and clear English
- no markdown
- no extra text`,
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

  return parsed.questions.map((q) => ({
    question: q.question.trim(),
    options: ensureValidOptions(q.options, q.correct_answer),
    correct_answer: q.correct_answer.trim(),
    explanation: q.explanation.trim(),
  }));
}

async function saveGeneratedQuestionsToSupabase(params: {
  topic: string;
  difficulty: Difficulty;
  questions: GeneratedQuestion[];
}) {
  const { topic, difficulty, questions } = params;

  if (questions.length === 0) return;

  const rows = questions.map((q) => ({
    topic,
    difficulty,
    question: q.question,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    is_active: true,
    usage_count: 0,
  }));

  const { error } = await supabaseAdmin.from("mcq_questions").insert(rows);

  if (error) {
    throw new Error(`Supabase insert error: ${error.message}`);
  }
}

async function incrementUsageCount(questions: SupabaseMCQQuestion[]) {
  const updates = questions.map((question) =>
    supabaseAdmin
      .from("mcq_questions")
      .update({ usage_count: question.usage_count + 1 })
      .eq("id", question.id)
  );

  await Promise.allSettled(updates);
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return jsonError("No autorizado", 401);
    }

    const body = await req.json();
    const parsedBody = quizCreationSchema.parse(body);

    const topic = normalizeTopic(parsedBody.topic);
    const amount = parsedBody.amount;
    const difficulty = normalizeDifficulty(parsedBody.difficulty);
    const type = parsedBody.type;

    if (type !== "mcq") {
      return jsonError(
        "Solo se admiten preguntas tipo MCQ en esta versión.",
        400
      );
    }

    let cachedQuestions: SupabaseMCQQuestion[] = [];

    try {
      cachedQuestions = await fetchExistingMCQQuestions({
        topic,
        difficulty,
        amount,
      });

      console.log("Preguntas encontradas en Supabase:", cachedQuestions.length);
    } catch (error) {
      console.error("Error leyendo cache desde Supabase:", error);
      cachedQuestions = [];
    }

    let finalQuestions: Array<SupabaseMCQQuestion | GeneratedQuestion> = [
      ...cachedQuestions,
    ];

    if (finalQuestions.length < amount) {
      const missingAmount = amount - finalQuestions.length;

      const aiQuestions = await generateQuestionsWithAI({
        topic,
        difficulty,
        amount: missingAmount,
      });

      const dedupedAIQuestions = dedupeQuestions(aiQuestions).slice(
        0,
        missingAmount
      );

      if (dedupedAIQuestions.length > 0) {
        try {
          await saveGeneratedQuestionsToSupabase({
            topic,
            difficulty,
            questions: dedupedAIQuestions,
          });

          console.log(
            "Preguntas guardadas en Supabase:",
            dedupedAIQuestions.length
          );
        } catch (error) {
          console.error("Error guardando cache en Supabase:", error);
        }

        finalQuestions = dedupeQuestions([
          ...finalQuestions,
          ...dedupedAIQuestions,
        ]);
      }
    }

    finalQuestions = dedupeQuestions(finalQuestions).slice(0, amount);

    if (finalQuestions.length === 0) {
      return jsonError("No se pudieron obtener ni generar preguntas.", 500);
    }

    const game = await prisma.game.create({
      data: {
        gameType: "mcq",
        timeStarted: new Date(),
        userId: session.user.id,
        topic,
      },
    });

    await prisma.question.createMany({
      data: finalQuestions.map((question) => ({
        question: question.question,
        answer: question.correct_answer,
        options: ensureValidOptions(question.options, question.correct_answer),
        explanation:
          "explanation" in question && question.explanation
            ? question.explanation
            : null,
        gameId: game.id,
        questionType: "mcq",
      })),
    });

    await incrementUsageCount(
      finalQuestions.filter(
        (q): q is SupabaseMCQQuestion => "id" in q && typeof q.id === "string"
      )
    );

    return NextResponse.json(
      {
        success: true,
        gameId: game.id,
        source:
          cachedQuestions.length >= amount
            ? "supabase_cache"
            : cachedQuestions.length > 0
            ? "supabase_plus_ai"
            : "ai",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/game error:", error);

    if (error instanceof z.ZodError) {
      return jsonError("Datos inválidos", 400, error.flatten());
    }

    if (error instanceof Error) {
      return jsonError("Error interno del servidor", 500, {
        message: error.message,
      });
    }

    return jsonError("Error interno del servidor", 500);
  }
}