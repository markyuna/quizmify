import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { calculateEarnedXp, calculateLevel, calculateSpeedBonusXp } from "@/lib/xp";
import { FREE_XP_CAP, FREE_LEVEL_CAP } from "@/lib/stripe";
import { registerQuizActivity, getEffectiveStreak, type StreakResult } from "@/lib/streak";
import { checkAndAwardCertificates } from "@/lib/certificates";
import { creditNeuronsForQuiz, isNeuronsEligibleDifficulty } from "@/lib/neurons";
import { isEffectivelyPro } from "@/lib/paywall";
import { resolvePaywallMessage } from "@/lib/paywallMessages";
import { getCategoryBySlug } from "@/lib/categories";
import { isTopicAllowed } from "@/lib/forbiddenWords";
import { normalizeTopic } from "@/lib/questionGeneration";
import { findCuratedQuiz } from "@/lib/curatedQuizzes/registry";
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

    // Curated quizzes (see src/lib/curatedQuizzes) reuse a fixed question
    // pool, unlike AI-generated topics, which are regenerated per play --
    // so unlimited replays would otherwise mean unlimited XP for the same
    // content. Matched the same locale-independent way findCuratedQuiz is
    // matched everywhere else (normalizeTopic(game.topic), not game.language).
    const curatedMatch = findCuratedQuiz(game.categorySlug, normalizeTopic(game.topic));

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

      // A resubmit of the same game that already earned XP (e.g. a page
      // refresh after finishing) shouldn't relabel itself as "practice
      // only" -- only flag it when a *different* game already claimed this
      // curated topic's one-time XP (see CuratedQuizCompletion).
      let curatedPracticeOnly = false;
      if (curatedMatch) {
        const completion = await prisma.curatedQuizCompletion.findUnique({
          where: {
            userId_categorySlug_topicNormalized: {
              userId,
              categorySlug: curatedMatch.categorySlug,
              topicNormalized: curatedMatch.topicNormalized,
            },
          },
          select: { gameId: true },
        });
        curatedPracticeOnly = completion !== null && completion.gameId !== game.id;
      }

      return NextResponse.json(
        {
          success: true,
          attemptId: existingAttempt.id,
          score: existingAttempt.score,
          correctAnswers: existingAttempt.correctAnswers,
          totalQuestions: existingAttempt.totalQuestions,
          earnedXp: 0,
          curatedPracticeOnly,
          speedBonusXp: 0,
          newXp: currentUser?.xp ?? 0,
          newLevel: level,
          previousLevel: level,
          didLevelUp: false,
          currentStreak: currentUser ? getEffectiveStreak(currentUser) : 0,
          streakExtended: false,
          streakProtected: false,
          trophyReason: null satisfies TrophyReason,
          // A resubmit credits no new correct answers, so there's no new
          // progress to report -- the original submit already showed it.
          neuronsProgress: null,
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
          curatedPracticeOnly: false,
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
          neuronsProgress: null,
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

      // Curated topics grant XP once per user, ever -- check-then-create
      // rather than create-and-catch: Postgres aborts the *whole*
      // transaction the instant one statement errors (a unique-constraint
      // hit included), so catching a P2002 here and continuing to the xp
      // increment below would still fail every later statement with
      // "current transaction is aborted". A pre-check has a race window
      // (two concurrent submits for the same brand-new topic), but that's
      // rare enough to just let the create() throw uncaught in that case --
      // the whole submit rolls back and the client can retry, at which
      // point this same check now finds the row. Streak/certificates/
      // trophy above are never gated -- replaying stays fully playable,
      // only the XP grant is one-time (see CuratedQuizCompletion in
      // prisma/schema.prisma).
      let xpToAward = earnedXp;
      let curatedPracticeOnly = false;

      if (curatedMatch) {
        const existingCompletion = await tx.curatedQuizCompletion.findUnique({
          where: {
            userId_categorySlug_topicNormalized: {
              userId,
              categorySlug: curatedMatch.categorySlug,
              topicNormalized: curatedMatch.topicNormalized,
            },
          },
          select: { id: true },
        });

        if (existingCompletion) {
          xpToAward = 0;
          curatedPracticeOnly = true;
        } else {
          await tx.curatedQuizCompletion.create({
            data: {
              userId,
              categorySlug: curatedMatch.categorySlug,
              topicNormalized: curatedMatch.topicNormalized,
              gameId: game.id,
            },
          });
        }
      }

      const previousLevel = previousUser.level;
      const isPro = isEffectivelyPro(previousUser);

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: xpToAward } },
        select: { xp: true },
      });

      // Neurons -- separate currency, separate calculation, separate call.
      // Never merged into the xp increment above on purpose (see
      // src/lib/neurons.ts's own comment on why these two systems must
      // stay decoupled).
      const neuronsResult = await creditNeuronsForQuiz(tx, {
        userId,
        gameId: game.id,
        difficulty: game.difficulty,
        correctAnswers,
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
        // unlock on upgrade. 0 instead when curatedPracticeOnly (see above).
        earnedXp: xpToAward,
        curatedPracticeOnly,
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
        // null for an easy-difficulty game -- creditNeuronsForQuiz short-
        // circuits before querying, so correctTowardNext/neededForNext
        // there wouldn't reflect real state. The result screen only
        // renders this for medium/hard anyway (it already has
        // game.difficulty client-side), but null keeps the contract honest.
        neuronsProgress: isNeuronsEligibleDifficulty(game.difficulty) ? neuronsResult : null,
      };
    });

    // Best-effort, outside the main (XP) transaction: publishing to the
    // community catalog is a nice-to-have, never allowed to break "finish
    // quiz" for the player who just earned XP for it. Its own $transaction
    // below keeps the new row and its topicKey consistent; any failure
    // (including a @@unique violation on an exact same-language repeat) is
    // swallowed by the outer catch.
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

          // A curated topic (see src/lib/curatedQuizzes) already has its one
          // canonical row seeded by hand -- matched by (categorySlug, topic)
          // only, deliberately ignoring game.language (same rule
          // findCuratedQuiz itself applies when routing a play request, see
          // its comment). Without this check, playing the same curated quiz
          // in a different UI locale would mint a second CategoryTopic row
          // for what is actually identical, fixed, French-only content --
          // that's exactly what happened before this check existed (a
          // completed es-locale playthrough published a duplicate "Qui est
          // le peintre?" row under language "es").
          const isCuratedTopic = findCuratedQuiz(category.slug, normalizedTopic) !== null;

          if (!isCuratedTopic) {
            // One transaction for the whole publish decision -- lookup,
            // topicKey-collision check, create, and (for a brand-new topic)
            // stamping topicKey -- so a row is never left without a topicKey.
            const created = await prisma.$transaction(async (tx) => {
              const catalogRows = await tx.categoryTopic.findMany({
                where: { categorySlug: category.slug },
                select: { id: true, topicKey: true, translatedLabels: true },
              });

              // An existing row in this category that already carries a
              // translation of this exact topic into game.language -- i.e.
              // the player replayed a card that was only ever shown here
              // translated (see resolveDisplayLabel's translatedLabels cache
              // in categoryTopics.ts). The (categorySlug, topicNormalized,
              // language) @@unique constraint can't catch this: the replayed
              // topic text is a legitimately distinct key.
              const translatedMatch = catalogRows.find((row) => {
                const translated = (row.translatedLabels as Record<string, string> | null)?.[game.language];
                return translated !== undefined && normalizeTopic(translated) === normalizedTopic;
              });

              if (translatedMatch) {
                // Reuse the matched row's topicKey so the new native row is
                // grouped with the concept it came from. Fallback to the
                // matched row's own id for a row created between the topicKey
                // backfill and this deploy (topicKey still null).
                const topicKey = translatedMatch.topicKey ?? translatedMatch.id;

                // Skip if that concept already has a native row in
                // game.language -- prevents a near-duplicate such as a native
                // "Fútbol" plus an "El fútbol" minted from the fr card's
                // translation.
                const existingInLanguage = await tx.categoryTopic.findFirst({
                  where: { topicKey, language: game.language },
                  select: { id: true },
                });
                if (existingInLanguage) return false;

                await tx.categoryTopic.create({
                  data: {
                    categorySlug: category.slug,
                    topicDisplay: game.topic,
                    topicNormalized: normalizedTopic,
                    language: game.language,
                    difficulty: game.difficulty ?? "medium",
                    createdByGameId: game.id,
                    topicKey,
                  },
                });
                return true;
              }

              // Genuinely new topic. Create it, then stamp topicKey = its own
              // id in the same transaction -- same shape as the backfill's
              // singleton segment. An exact same-language repeat throws on
              // the @@unique constraint and is swallowed by the outer catch.
              const row = await tx.categoryTopic.create({
                data: {
                  categorySlug: category.slug,
                  topicDisplay: game.topic,
                  topicNormalized: normalizedTopic,
                  language: game.language,
                  difficulty: game.difficulty ?? "medium",
                  createdByGameId: game.id,
                },
              });
              await tx.categoryTopic.update({
                where: { id: row.id },
                data: { topicKey: row.id },
              });
              return true;
            });

            if (created) revalidatePath(`/quiz/categoria/${category.slug}`);
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
        curatedPracticeOnly: result.curatedPracticeOnly,
        // Zeroed alongside earnedXp when curatedPracticeOnly, so the
        // results screen never shows a "+N XP speed bonus" sub-line next to
        // a "+0 XP" headline.
        speedBonusXp: result.curatedPracticeOnly ? 0 : speedBonusXp,
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
        neuronsProgress: result.neuronsProgress,
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