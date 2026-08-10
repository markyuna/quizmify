import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { calculateEarnedXp, calculateLevel } from "@/lib/xp";
import { FREE_LEVEL_CAP } from "@/lib/stripe";
import { registerQuizActivity } from "@/lib/streak";
import { guestIdSchema } from "@/schemas/form/guestGame";

const claimQuizSchema = z.object({ guestId: guestIdSchema });

/**
 * Migrates a guest's played-but-unclaimed quiz onto their new account, the
 * moment they register -- mirrors claimGuestAttempts in guestPlay.ts, which
 * does the same for the 3 daily mini-games. Reconstructs the Attempt and XP
 * from Question.userAnswer/isCorrect (set live during play by
 * /api/checkAnswer, which -- unlike the authenticated path -- never wrote
 * UserQuestionProgress for a guest), since a guest has no session to have
 * called /api/quiz/submit with. No per-answer timing survives the
 * guest -> registration hop, so a claimed quiz never earns the timed-mode
 * speed bonus that a live submit would.
 */
export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    // Matches the contract GuestRoundClaim.tsx already polls on for
    // /api/guest/claim: "unauthenticated" tells the client to leave its
    // guest cookie alone and retry on a later, authenticated page load.
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", reason: "unauthenticated" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const { guestId } = claimQuizSchema.parse(body);

    // A guest is limited to one quiz per guestId (see POST /api/game), so
    // this is realistically 0 or 1 rows -- findMany rather than findFirst
    // just so a future relaxation of that cap doesn't silently drop games.
    const games = await prisma.game.findMany({
      where: { guestId, userId: null, claimedAt: null, gameType: "mcq" },
      include: {
        questions: {
          select: {
            id: true,
            answer: true,
            userAnswer: true,
            isCorrect: true,
            sourceQuestionId: true,
          },
        },
      },
    });

    if (games.length === 0) {
      return NextResponse.json({ success: true, claimedCount: 0, xpAwarded: 0, gameId: null });
    }

    const result = await prisma.$transaction(async (tx) => {
      let xpAwarded = 0;
      const claimedGameIds: string[] = [];

      for (const game of games) {
        // Only questions actually answered before the guest left the quiz
        // count -- same "answered subset" idiom /api/quiz/submit uses.
        const answeredQuestions = game.questions.filter((q) => q.userAnswer !== null);
        if (answeredQuestions.length === 0) continue;

        const totalQuestions = answeredQuestions.length;
        const correctAnswers = answeredQuestions.filter((q) => q.isCorrect).length;
        const score = Math.round((correctAnswers / totalQuestions) * 100);

        // Race-safe the same way claimGuestAttempts is: scoped to
        // claimedAt: null, so only one concurrent request can win the flip
        // (e.g. a duplicate retry firing before the first one committed).
        const claimResult = await tx.game.updateMany({
          where: { id: game.id, userId: null, claimedAt: null },
          data: { userId, claimedAt: new Date(), score, timeEnded: game.timeEnded ?? new Date() },
        });
        if (claimResult.count === 0) continue;

        await tx.attempt.create({
          data: {
            userId,
            gameId: game.id,
            score,
            totalQuestions,
            correctAnswers,
            timeSpent: 0,
            answers: {
              create: answeredQuestions.map((q) => ({
                questionId: q.id,
                selectedAnswer: q.userAnswer as string,
                isCorrect: q.isCorrect ?? false,
              })),
            },
          },
        });

        for (const question of answeredQuestions) {
          const trackedQuestionId = question.sourceQuestionId ?? question.id;
          const correct = question.isCorrect ?? false;
          const progressUpdate = correct
            ? { correctCount: { increment: 1 }, needsReview: false, lastAnsweredCorrectly: true }
            : { wrongCount: { increment: 1 }, needsReview: true, lastAnsweredCorrectly: false };

          await tx.userQuestionProgress.upsert({
            where: { userId_questionId: { userId, questionId: trackedQuestionId } },
            update: progressUpdate,
            create: {
              userId,
              questionId: trackedQuestionId,
              correctCount: correct ? 1 : 0,
              wrongCount: correct ? 0 : 1,
              needsReview: !correct,
              lastAnsweredCorrectly: correct,
            },
          });
        }

        xpAwarded += calculateEarnedXp({ correctAnswers, totalQuestions });
        claimedGameIds.push(game.id);
      }

      if (claimedGameIds.length > 0) {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: xpAwarded } },
          select: { xp: true, level: true },
        });

        // Mirrors claimGuestAttempts and /api/quiz/submit: xp always
        // accumulates in full, only the *level* is capped -- and a
        // brand-new account is never Pro, so the free cap always applies
        // here regardless of what the account becomes later.
        const trueLevel = calculateLevel(updatedUser.xp);
        const newLevel = Math.min(trueLevel, FREE_LEVEL_CAP);
        if (newLevel !== updatedUser.level) {
          await tx.user.update({ where: { id: userId }, data: { level: newLevel } });
        }

        // One registration event is one day of activity, same as
        // claimGuestAttempts -- starts the user's streak from their first
        // (guest-played, now claimed) quiz.
        await registerQuizActivity(tx, userId);
      }

      return { claimedGameIds, xpAwarded };
    });

    return NextResponse.json({
      success: true,
      claimedCount: result.claimedGameIds.length,
      xpAwarded: result.xpAwarded,
      gameId: result.claimedGameIds[0] ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.flatten() }, { status: 400 });
    }

    console.error("POST /api/guest/claim-quiz error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
