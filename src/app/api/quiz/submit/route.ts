import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { calculateEarnedXp, calculateLevel, calculateSpeedBonusXp } from "@/lib/xp";
import { FREE_XP_CAP, FREE_LEVEL_CAP } from "@/lib/stripe";
import { registerQuizActivity, getEffectiveStreak, type StreakResult } from "@/lib/streak";
import { checkAndAwardCertificates } from "@/lib/certificates";
import { isEffectivelyPro } from "@/lib/paywall";
import { resolvePaywallMessage } from "@/lib/paywallMessages";
import { getCategoryBySlug } from "@/lib/categories";
import { isTopicAllowed } from "@/lib/forbiddenWords";
import { normalizeTopic } from "@/lib/questionGeneration";
import { submitQuizSchema } from "@/schemas/form/quiz";

export type TrophyReason = "perfect" | "streak" | null;

function computeTrophyReason(score: number, streak: StreakResult): TrophyReason {
  if (score === 100) return "perfect";
  // A brand new account's very first quiz trivially "beats" a longestStreak
  // of 0 -- require at least a 2-day streak before calling it a record.
  if (streak.isNewRecord && streak.currentStreak >= 2) return "streak";
  return null;
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await req.json();
    const parsedBody = submitQuizSchema.parse(body);

    const game = await prisma.game.findFirst({
      where: {
        id: parsedBody.gameId,
        userId,
      },
      include: {
        questions: {
          select: {
            id: true,
            answer: true,
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (!game.questions.length) {
      return NextResponse.json(
        { error: "This quiz has no questions" },
        { status: 400 }
      );
    }

    const existingAttempt = await prisma.attempt.findFirst({
      where: {
        gameId: game.id,
        userId,
      },
      select: {
        id: true,
        score: true,
        correctAnswers: true,
        totalQuestions: true,
      },
    });

    if (existingAttempt) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true, currentStreak: true, lastQuizDate: true },
      });

      const level = currentUser?.level ?? 1;

      return NextResponse.json(
        {
          success: true,
          attemptId: existingAttempt.id,
          score: existingAttempt.score,
          correctAnswers: existingAttempt.correctAnswers,
          totalQuestions: existingAttempt.totalQuestions,
          earnedXp: 0,
          speedBonusXp: 0,
          newXp: currentUser?.xp ?? 0,
          newLevel: level,
          previousLevel: level,
          didLevelUp: false,
          currentStreak: currentUser ? getEffectiveStreak(currentUser) : 0,
          streakExtended: false,
          streakProtected: false,
          trophyReason: null satisfies TrophyReason,
        },
        { status: 200 }
      );
    }

    const questionMap = new Map(
      game.questions.map((question) => [question.id, question])
    );

    const uniqueAnswersMap = new Map<string, { selectedAnswer: string; responseTimeMs: number | null }>();

    for (const answer of parsedBody.answers) {
      if (!uniqueAnswersMap.has(answer.questionId)) {
        uniqueAnswersMap.set(answer.questionId, {
          selectedAnswer: answer.selectedAnswer.trim(),
          responseTimeMs: answer.responseTimeMs ?? null,
        });
      }
    }

    let correctAnswers = 0;

    const answersToCreate = Array.from(uniqueAnswersMap.entries())
      .map(([questionId, { selectedAnswer, responseTimeMs }]) => {
        const question = questionMap.get(questionId);

        if (!question) {
          return null;
        }

        const isCorrect =
          question.answer.trim().toLowerCase() === selectedAnswer.toLowerCase();

        if (isCorrect) {
          correctAnswers += 1;
        }

        return {
          questionId,
          selectedAnswer,
          isCorrect,
          responseTimeMs,
        };
      })
      .filter(
        (
          answer
        ): answer is {
          questionId: string;
          selectedAnswer: string;
          isCorrect: boolean;
          responseTimeMs: number | null;
        } => answer !== null
      );

    const totalQuestions = game.questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    const safeTimeSpent = Math.max(
      0,
      Math.min(parsedBody.timeSpent, 60 * 60 * 3)
    );

    const timeLimitMs =
      game.isTimed && game.timePerQuestionSec ? game.timePerQuestionSec * 1000 : 0;

    const speedBonusXp = calculateSpeedBonusXp({
      answers: answersToCreate,
      timeLimitMs,
    });

    const earnedXp =
      calculateEarnedXp({
        correctAnswers,
        totalQuestions,
      }) + speedBonusXp;

    const result = await prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.attempt.create({
        data: {
          userId,
          gameId: game.id,
          score,
          totalQuestions,
          correctAnswers,
          timeSpent: safeTimeSpent,
          answers: {
            create: answersToCreate,
          },
        },
      });

      await tx.game.update({
        where: {
          id: game.id,
        },
        data: {
          score,
          timeEnded: new Date(),
        },
      });

      const previousUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          level: true,
          subscriptionStatus: true,
          premiumUntil: true,
          freeTrialUsedAt: true,
          streakProtectionsUsed: true,
        },
      });

      if (!previousUser) {
        return {
          attempt: createdAttempt,
          earnedXp: 0,
          newXp: 0,
          previousLevel: 1,
          newLevel: 1,
          didLevelUp: false,
          hitFreeLimit: false,
          trialAvailable: false,
          paywallMessage: null,
          streak: {
            currentStreak: 0,
            longestStreak: 0,
            isNewRecord: false,
            streakExtended: false,
            streakProtected: false,
            streakReset: false,
            protectionsRemaining: 0,
          } satisfies StreakResult,
          trophyReason: null satisfies TrophyReason,
        };
      }

      const streak = await registerQuizActivity(tx, userId);
      const trophyReason = computeTrophyReason(score, streak);

      await checkAndAwardCertificates(tx, userId, {
        topic: game.topic,
        currentStreak: streak.currentStreak,
      });

      if (trophyReason) {
        await tx.trophy.create({
          data: {
            userId,
            gameId: game.id,
            kind: trophyReason,
            streakCount: trophyReason === "streak" ? streak.currentStreak : null,
          },
        });
      }

      const previousLevel = previousUser.level;
      const isPro = isEffectivelyPro(previousUser);

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: earnedXp } },
        select: { xp: true },
      });

      // xp always keeps accumulating -- it's the permanent record of
      // everything the user has earned. Only the *level* is capped for
      // free users, so progress made during a Pro window survives a lapse
      // and comes straight back on resubscribe. See src/lib/pro.ts.
      const newXp = updatedUser.xp;
      const trueLevel = calculateLevel(newXp);
      const hitFreeLimit = !isPro && newXp >= FREE_XP_CAP;
      const newLevel = isPro ? trueLevel : Math.min(trueLevel, FREE_LEVEL_CAP);

      if (newLevel !== previousLevel) {
        await tx.user.update({
          where: { id: userId },
          data: { level: newLevel },
        });
      }

      const didLevelUp = newLevel > previousLevel;
      // Real progress sitting behind the paywall, as opposed to merely
      // being parked at the cap -- drives the "level N is saved" message.
      const frozenLevel = trueLevel > newLevel ? trueLevel : null;

      // Only bother resolving a personalized message on the one submit
      // that actually crosses into the cap -- every other quiz doesn't
      // need it, and it's an extra count query.
      let paywallMessage: { key: string; values: Record<string, string | number> } | null = null;
      if (hitFreeLimit) {
        const paywallContext = {
          quizzesPlayed: await tx.attempt.count({ where: { userId } }),
          currentStreak: streak.currentStreak,
          usedFreeTrial: previousUser.freeTrialUsedAt !== null,
          usedStreakProtection: previousUser.streakProtectionsUsed > 0,
        };
        const variant = resolvePaywallMessage(paywallContext);
        paywallMessage = { key: variant.messageKey, values: variant.values(paywallContext) };
      }

      return {
        attempt: createdAttempt,
        // The full amount is always banked now that xp is never clamped --
        // free users past the cap keep earning toward the level they'll
        // unlock on upgrade.
        earnedXp,
        newXp,
        previousLevel,
        newLevel,
        frozenLevel,
        didLevelUp,
        hitFreeLimit,
        trialAvailable: hitFreeLimit && !previousUser.freeTrialUsedAt,
        paywallMessage,
        streak,
        trophyReason,
      };
    });

    // Best-effort, outside the main transaction: publishing to the
    // community catalog is a nice-to-have, never allowed to break "finish
    // quiz" for the player who just earned XP for it. See CategoryTopic in
    // prisma/schema.prisma -- the @@unique constraint is what actually
    // prevents duplicates, this create() just relies on it and swallows the
    // conflict along with every other failure mode.
    //
    // Reads game.categorySlug (set server-side at POST /api/game, see
    // Game.categorySlug in prisma/schema.prisma) rather than trusting a
    // client-supplied value on this request -- the category picker is
    // hidden in QuizCreation.tsx whenever a category was inherited from a
    // catalog page, so there's no client state here that should be treated
    // as authoritative.
    if (game.categorySlug) {
      try {
        const category = getCategoryBySlug(game.categorySlug);
        if (category && isTopicAllowed(game.topic)) {
          const normalizedTopic = normalizeTopic(game.topic);

          // The (categorySlug, topicNormalized, language) unique constraint
          // below only catches an exact same-language repeat. It can't
          // catch replaying a topic that's already cataloged under a
          // *different* language and was only being shown here as a
          // translated/padded card (see resolveDisplayLabel's
          // translatedLabels cache in categoryTopics.ts) -- that always
          // produces a legitimately distinct key. Check translatedLabels
          // for an existing row that was already translated into
          // game.language and matches this topic, so replaying a
          // translated card doesn't mint a second entry for the same
          // underlying topic.
          const existingViaTranslation = await prisma.categoryTopic.findMany({
            where: { categorySlug: category.slug },
            select: { translatedLabels: true },
          });
          const alreadyCatalogedViaTranslation = existingViaTranslation.some((row) => {
            const translated = (row.translatedLabels as Record<string, string> | null)?.[game.language];
            return translated !== undefined && normalizeTopic(translated) === normalizedTopic;
          });

          if (!alreadyCatalogedViaTranslation) {
            await prisma.categoryTopic.create({
              data: {
                categorySlug: category.slug,
                topicDisplay: game.topic,
                topicNormalized: game.topic,
                language: game.language,
                difficulty: game.difficulty ?? "medium",
                createdByGameId: game.id,
              },
            });
            revalidatePath(`/quiz/categoria/${category.slug}`);
          }
        }
      } catch (error) {
        console.error("CategoryTopic publish failed (non-fatal):", error);
      }
    }

    return NextResponse.json(
      {
        success: true,
        attemptId: result.attempt.id,
        score,
        correctAnswers,
        totalQuestions,
        earnedXp: result.earnedXp,
        speedBonusXp,
        newXp: result.newXp,
        previousLevel: result.previousLevel,
        newLevel: result.newLevel,
        frozenLevel: result.frozenLevel,
        didLevelUp: result.didLevelUp,
        hitFreeLimit: result.hitFreeLimit,
        trialAvailable: result.trialAvailable,
        paywallMessage: result.paywallMessage,
        currentStreak: result.streak.currentStreak,
        streakExtended: result.streak.streakExtended,
        streakProtected: result.streak.streakProtected,
        trophyReason: result.trophyReason,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/quiz/submit error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid data",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}