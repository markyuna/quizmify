import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { quizCreationSchema } from "@/schemas/form/quiz";
import { getRequestLocale } from "@/i18n/get-locale";
import { isUserAtFreeLimit, isUserPro } from "@/lib/paywall";
import { isGeographyTopic } from "@/lib/geography";
import { getCategoryBySlug } from "@/lib/categories";
import { TIMED_MODE_SECONDS_PER_QUESTION } from "@/lib/timedMode";
import { normalizeTopic, normalizeDifficulty, ensureValidOptions } from "@/lib/questionGeneration";
import { sourceQuestions, incrementUsageCount, deactivateQuestions } from "@/lib/questionSourcing";
import { findCuratedQuiz } from "@/lib/curatedQuizzes/registry";
import type { CuratedQuizQuestion } from "@/lib/curatedQuizzes/types";
import type { SourcedQuestion } from "@/lib/questionSourcing";
import { MIN_QUESTIONS_FOR_ADAPTIVE_DIFFICULTY, splitIntoBatches } from "@/lib/adaptiveDifficulty";
import { generatePuzzleImage, PuzzleImageError } from "@/lib/puzzleImage";
import { getGuestIdFromCookie } from "@/lib/guestQuiz";

// CuratedQuizQuestion.titleKey resolved into actual sentences (see the
// curated branch below) -- the rest of this route (createMany, the
// incrementUsageCount cast) only ever needs the resolved shape.
type ResolvedCuratedQuestion = Omit<CuratedQuizQuestion, "titleKey"> & { question: string; explanation: string };

// A guest is capped well below the adaptive-difficulty threshold and never
// gets Puzzle Mode (DALL-E generation), so a single unauthenticated request
// can't be scripted into unbounded OpenAI cost.
const GUEST_MAX_QUESTIONS = 5;

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

export async function POST(req: Request) {
  // Declared outside the try block (not just the `sourced`/`sourceQuestions`
  // scope below) so the catch clause can still see them: sourceQuestions()
  // may already have inserted new mcq_questions cache rows before a later
  // failure -- Puzzle Mode generation or the Game/Question transaction --
  // aborts the request. Those rows would otherwise sit there as if a real
  // game had been created from them (see e.g. TopicCarousel's "latest
  // topics" shelf, which has no notion of "did this ever become a Game").
  let newlyCreatedIds: string[] = [];
  let gameCreated = false;

  try {
    const session = await getAuthSession();
    const userId = session?.user?.id ?? null;
    const guestId = userId ? null : await getGuestIdFromCookie();

    if (!userId && !guestId) {
      return jsonError("Unauthorized", 401);
    }

    if (userId && (await isUserAtFreeLimit(userId))) {
      return jsonError("FREE_LIMIT_REACHED", 403);
    }

    const body = await req.json();
    const parsedBody = quizCreationSchema.parse(body);

    const topic = normalizeTopic(parsedBody.topic);
    const amount = parsedBody.amount;
    const difficulty = normalizeDifficulty(parsedBody.difficulty);
    const language = await getRequestLocale();
    const isGeography = isGeographyTopic(topic);
    const isTimed = parsedBody.isTimed;
    const puzzleMode = parsedBody.puzzleMode;

    // When the player already knows (or inherited) a category for this
    // topic, scope question generation to it -- see the CRITICAL SCOPE
    // CONSTRAINT block in generateQuestionsWithAI. Resolved the same way
    // /api/category-topics/lookup resolves it for the UI hint.
    let categoryName: string | null = null;
    let categorySlug: string | null = null;
    if (parsedBody.categorySlug) {
      const category = getCategoryBySlug(parsedBody.categorySlug);
      if (category) {
        const t = await getTranslations({ locale: language, namespace: "Categories" });
        categoryName = t(`${category.slug}.name`);
        categorySlug = category.slug;
      }
    }

    // A curated topic (hand-picked questions, e.g. image-based) always
    // bypasses AI generation entirely -- see src/lib/curatedQuizzes. Matched
    // by (categorySlug, normalized topic) only, NOT the request's language --
    // the curated content is fixed regardless of the visitor's locale (see
    // findCuratedQuiz's own comment). Resolved before the guest checks below
    // because a curated topic is exempt from the guest amount cap (see the
    // comment on that check) -- it costs nothing to generate, there's
    // nothing to rate-limit.
    const curated = findCuratedQuiz(categorySlug, topic);

    if (guestId) {
      // Abuse brake: one guest-played quiz per guestId, enforced here (not
      // just in the UI) since the cookie is client-controlled.
      const existingGuestGames = await prisma.game.count({
        where: { guestId, userId: null },
      });
      if (existingGuestGames >= 1) {
        return jsonError("GUEST_LIMIT_REACHED", 403);
      }
      if (parsedBody.puzzleMode) {
        return jsonError("PUZZLE_REQUIRES_PRO", 403);
      }
      // The cap exists to bound OpenAI generation cost (see
      // GUEST_MAX_QUESTIONS above) -- a curated topic never calls OpenAI, so
      // it's exempt regardless of its fixed question count.
      if (!curated && parsedBody.amount > GUEST_MAX_QUESTIONS) {
        return jsonError("GUEST_AMOUNT_LIMIT", 400);
      }
    }

    if (puzzleMode && (!userId || !(await isUserPro(userId)))) {
      return jsonError("PUZZLE_REQUIRES_PRO", 403);
    }

    // Long enough quizzes generate only the first half of questions now,
    // then adjust difficulty from in-quiz performance and generate the
    // rest via /api/game/[gameId]/next-batch once the user reaches it --
    // see src/lib/adaptiveDifficulty.ts. Guests never get adaptive
    // difficulty (next-batch requires a session), so everything is
    // generated in one batch for them regardless of amount. A curated topic
    // is always served whole, in one batch -- there's no "adjust difficulty"
    // to do on a fixed hand-picked set, and `amount` is ignored entirely.
    const useAdaptiveDifficulty = !curated && !guestId && amount >= MIN_QUESTIONS_FOR_ADAPTIVE_DIFFICULTY;
    const { firstBatch } = splitIntoBatches(amount);
    const requestAmount = useAdaptiveDifficulty ? firstBatch : amount;

    let sourced: (SourcedQuestion | ResolvedCuratedQuestion)[];
    let cachedCount = 0;
    let poolTarget = 0;

    if (curated) {
      // Fixed, hand-curated order -- not shuffled. Only each question's own
      // 4 options get shuffled (ensureValidOptions), same as every other
      // quiz's options. The question sentence and explanation are both
      // resolved from titleKey through this request's own locale
      // (`language`, not curated.language -- see translationNamespace's
      // comment in curatedQuizzes/types.ts), so the same curated set reads
      // correctly for every UI language.
      const tCurated = await getTranslations({ locale: language, namespace: curated.translationNamespace });
      sourced = curated.questions.map((question) => {
        const title = tCurated(`titles.${question.titleKey}`);
        return {
          ...question,
          question: tCurated("questionTemplate", { title }),
          explanation: tCurated(`explanations.${question.titleKey}`),
          options: ensureValidOptions(question.options, question.correct_answer),
        };
      });
    } else {
      const result = await sourceQuestions({
        topic,
        difficulty,
        language,
        amount: requestAmount,
        isGeography,
        categoryName,
      });
      sourced = result.questions;
      cachedCount = result.cachedCount;
      poolTarget = result.poolTarget;
      newlyCreatedIds = result.newlyCreatedIds;
    }

    if (sourced.length === 0) {
      return jsonError("Could not fetch or generate questions.", 500);
    }

    let puzzleImageUrl: string | null = null;
    if (puzzleMode) {
      try {
        puzzleImageUrl = await generatePuzzleImage(topic);
      } catch (error) {
        console.error("generatePuzzleImage failed:", error);
        await deactivateQuestions(newlyCreatedIds);
        // Storage misconfiguration and a flaky DALL-E call both break the
        // same feature, but only one of them is worth retrying -- keep the
        // codes distinct so logs and clients can tell them apart.
        return jsonError(
          error instanceof PuzzleImageError
            ? error.code
            : "PUZZLE_IMAGE_GENERATION_FAILED",
          500
        );
      }
    }

    const game = await prisma.$transaction(async (tx) => {
      const createdGame = await tx.game.create({
        data: {
          gameType: "mcq",
          timeStarted: new Date(),
          userId,
          guestId,
          topic,
          difficulty,
          language,
          isTimed,
          timePerQuestionSec: isTimed ? TIMED_MODE_SECONDS_PER_QUESTION : null,
          plannedQuestionCount: useAdaptiveDifficulty ? amount : null,
          puzzleImageUrl,
          categorySlug,
        },
      });

      await tx.question.createMany({
        data: sourced.map((question) => ({
          question: question.question,
          answer: question.correct_answer,
          options: question.options,
          explanation:
            "explanation" in question && question.explanation
              ? question.explanation
              : null,
          country: "country" in question && question.country ? question.country : null,
          imageUrl: "imageUrl" in question && question.imageUrl ? question.imageUrl : null,
          gameId: createdGame.id,
          questionType: "mcq",
        })),
      });

      return createdGame;
    });
    gameCreated = true;

    // Safe even though `sourced` is a union: curated questions never carry
    // an `id`, so incrementUsageCount's internal SupabaseMCQQuestion filter
    // (`"id" in q`) already excludes them at runtime -- this cast just tells
    // TS what's already true.
    await incrementUsageCount(sourced as SourcedQuestion[]);

    return NextResponse.json(
      {
        success: true,
        gameId: game.id,
        source: curated
          ? "curated"
          : cachedCount >= poolTarget
            ? "supabase_cache"
            : cachedCount > 0
              ? "supabase_plus_ai"
              : "ai",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/game error:", error);

    if (!gameCreated) {
      await deactivateQuestions(newlyCreatedIds);
    }

    if (error instanceof z.ZodError) {
      return jsonError("Invalid data", 400, error.flatten());
    }

    if (error instanceof Error) {
      return jsonError("Internal server error", 500, {
        message: error.message,
      });
    }

    return jsonError("Internal server error", 500);
  }
}
