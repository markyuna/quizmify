import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { Difficulty } from "@/lib/topicUtils";

// Deliberately its own module, never imported by src/lib/xp.ts or vice
// versa -- Neurons and XP are two systems that must be able to evolve
// independently. Sharing a calculation here is exactly how the
// completionXp bug leaked from quiz submit into the 3 guest daily games:
// they went through the same calculateEarnedXpBreakdown().
const NEURONS_PER_BATCH = 50;
const CORRECT_ANSWERS_PER_BATCH = 10;
const ELIGIBLE_DIFFICULTIES: Difficulty[] = ["medium", "hard"];

/**
 * Credits Neurons for a just-submitted AI quiz, 50 per 10 accumulated
 * correct answers across every medium/hard game this user has ever played
 * (easy games contribute nothing). The remainder that hasn't completed a
 * batch of 10 yet is never stored -- it's derived fresh on every call from
 * the actual history (Attempt) and the actual ledger (NeuronTransaction),
 * so nothing can drift out of sync the way a separate running-counter
 * field could. The cost is one aggregate query per eligible submit; skipped
 * entirely for an easy-difficulty game before touching the DB at all.
 *
 * Must run inside the same $transaction as the rest of /api/quiz/submit
 * (pass that transaction's `tx`) so the two aggregate reads and the two
 * writes below are atomic with everything else in that submit. This closes
 * the race window *within* one submit; it does not by itself serialize two
 * genuinely concurrent submits from the same user racing each other (same
 * accepted trade-off this route already makes for the curated-topic
 * check-then-create above) -- flagged here rather than silently assumed
 * solved.
 */
export async function creditNeuronsForQuiz(
  tx: Prisma.TransactionClient | PrismaClient,
  params: {
    userId: string;
    gameId: string;
    difficulty: string | null;
    correctAnswers: number;
  }
): Promise<{ neuronsEarned: number }> {
  if (!ELIGIBLE_DIFFICULTIES.includes(params.difficulty as Difficulty)) {
    return { neuronsEarned: 0 };
  }

  const correctTotal = await tx.attempt.aggregate({
    where: {
      userId: params.userId,
      game: { difficulty: { in: ELIGIBLE_DIFFICULTIES } },
    },
    _sum: { correctAnswers: true },
  });
  const totalCorrectCount = correctTotal._sum.correctAnswers ?? 0;
  const totalBatchesEarnable = Math.floor(totalCorrectCount / CORRECT_ANSWERS_PER_BATCH);

  const creditedTotal = await tx.neuronTransaction.aggregate({
    where: { userId: params.userId, type: "earn_quiz" },
    _sum: { amount: true },
  });
  // Exact division: every earn_quiz amount is a multiple of
  // NEURONS_PER_BATCH by construction (only ever written below).
  const alreadyCreditedBatches = (creditedTotal._sum.amount ?? 0) / NEURONS_PER_BATCH;

  const newBatches = totalBatchesEarnable - alreadyCreditedBatches;
  if (newBatches <= 0) return { neuronsEarned: 0 };

  const neuronsEarned = newBatches * NEURONS_PER_BATCH;

  await tx.neuronTransaction.create({
    data: {
      userId: params.userId,
      type: "earn_quiz",
      amount: neuronsEarned,
      relatedGameId: params.gameId,
    },
  });
  await tx.user.update({
    where: { id: params.userId },
    data: { neuronsBalance: { increment: neuronsEarned } },
  });

  return { neuronsEarned };
}
