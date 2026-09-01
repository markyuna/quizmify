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

// Exported so callers (e.g. /api/quiz/submit, deciding whether to include
// neuronsProgress in its response) can check eligibility without
// duplicating this list.
export function isNeuronsEligibleDifficulty(difficulty: string | null): boolean {
  return ELIGIBLE_DIFFICULTIES.includes(difficulty as Difficulty);
}

// Shared by creditNeuronsForQuiz and getNeuronsProgress so there is exactly
// one query that defines "how many eligible correct answers has this user
// ever banked" -- neither caller recomputes it independently.
async function getEligibleCorrectAnswersTotal(
  client: Prisma.TransactionClient | PrismaClient,
  userId: string
): Promise<number> {
  const correctTotal = await client.attempt.aggregate({
    where: {
      userId,
      game: { difficulty: { in: ELIGIBLE_DIFFICULTIES } },
    },
    _sum: { correctAnswers: true },
  });
  return correctTotal._sum.correctAnswers ?? 0;
}

/**
 * Derives how far the user is toward their next 50-Neuron batch, purely
 * from the current Attempt history -- no ledger read needed, since the
 * remainder toward the next batch is always totalCorrect % 10 regardless
 * of how many batches have already been credited. Safe to call outside a
 * submit transaction (dashboard header reads); pass `prisma` directly.
 */
export async function getNeuronsProgress(
  client: Prisma.TransactionClient | PrismaClient,
  userId: string
): Promise<{ correctTowardNext: number; neededForNext: number }> {
  const totalCorrectCount = await getEligibleCorrectAnswersTotal(client, userId);
  return {
    correctTowardNext: totalCorrectCount % CORRECT_ANSWERS_PER_BATCH,
    neededForNext: CORRECT_ANSWERS_PER_BATCH,
  };
}

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
): Promise<{ neuronsEarned: number; correctTowardNext: number; neededForNext: number }> {
  if (!ELIGIBLE_DIFFICULTIES.includes(params.difficulty as Difficulty)) {
    return { neuronsEarned: 0, correctTowardNext: 0, neededForNext: CORRECT_ANSWERS_PER_BATCH };
  }

  const totalCorrectCount = await getEligibleCorrectAnswersTotal(tx, params.userId);
  const totalBatchesEarnable = Math.floor(totalCorrectCount / CORRECT_ANSWERS_PER_BATCH);
  const correctTowardNext = totalCorrectCount % CORRECT_ANSWERS_PER_BATCH;

  const creditedTotal = await tx.neuronTransaction.aggregate({
    where: { userId: params.userId, type: "earn_quiz" },
    _sum: { amount: true },
  });
  // Exact division: every earn_quiz amount is a multiple of
  // NEURONS_PER_BATCH by construction (only ever written below).
  const alreadyCreditedBatches = (creditedTotal._sum.amount ?? 0) / NEURONS_PER_BATCH;

  const newBatches = totalBatchesEarnable - alreadyCreditedBatches;
  if (newBatches <= 0) {
    return { neuronsEarned: 0, correctTowardNext, neededForNext: CORRECT_ANSWERS_PER_BATCH };
  }

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

  return { neuronsEarned, correctTowardNext, neededForNext: CORRECT_ANSWERS_PER_BATCH };
}

const PERSONALITY_BONUS_AMOUNT = 50;

/**
 * Merges the +50 "first mascot" bonus into the exact same tx.user.update
 * that sets personalityAnimal, instead of a separate call after it -- both
 * call sites (confirmPersonalityTestAttempt and claimPersonalityTestAttempts
 * in src/lib/personalityTests/attempts.ts) only ever reach that update when
 * personalityAnimal is transitioning from null to a value (guarded before
 * they get there), so no extra "first time?" check belongs here. Uses
 * Prisma's nested write on the NeuronTransaction relation so the ledger
 * row, the balance increment, and the animal assignment are one Prisma
 * call -- if a third write site to personalityAnimal ever appears, it has
 * to explicitly call this too, but at least the bonus itself can't silently
 * drift out of step with the transaction/balance that back it.
 */
export function withPersonalityBonus(baseData: { personalityAnimal: string; personalityAnimalSetAt: Date }) {
  return {
    ...baseData,
    neuronsBalance: { increment: PERSONALITY_BONUS_AMOUNT },
    neuronTransactions: {
      create: { type: "bonus_personality" as const, amount: PERSONALITY_BONUS_AMOUNT, gameKey: null },
    },
  };
}

/**
 * Credits the Neurons from a completed Stripe checkout for a shop package.
 * Called from the Stripe webhook (POST /api/stripe/webhook), which has no
 * surrounding transaction, so this opens its own.
 *
 * Idempotency (Stripe retries webhooks; a double credit here is real money):
 * the NeuronPurchase row -- created `pending` by POST /api/checkout/neurons
 * -- is flipped to `completed` with a conditional `updateMany` scoped to
 * `status: "pending"`. Only the call that actually flips the row (count === 1)
 * goes on to write the ledger row and bump the balance; a retry, or a
 * concurrent delivery that lost the race, sees count === 0 and no-ops.
 *
 * `neuronAmount` / `packageKey` are read back from the pending row (written
 * server-side from the validated catalog), never trusted from Stripe
 * metadata.
 */
export async function creditNeuronsForPurchase(
  client: PrismaClient,
  params: { stripeSessionId: string; amountTotalCents: number | null }
): Promise<{ credited: boolean; userId?: string; neuronAmount?: number }> {
  return client.$transaction(async (tx) => {
    const purchase = await tx.neuronPurchase.findUnique({
      where: { stripeSessionId: params.stripeSessionId },
      select: { userId: true, neuronAmount: true, packageKey: true, status: true },
    });

    if (!purchase) {
      console.error(
        `[neurons] purchase webhook: no NeuronPurchase row for Stripe session ${params.stripeSessionId} -- not crediting`
      );
      return { credited: false };
    }

    if (purchase.status === "completed") {
      return { credited: false, userId: purchase.userId, neuronAmount: purchase.neuronAmount };
    }

    const flipped = await tx.neuronPurchase.updateMany({
      where: { stripeSessionId: params.stripeSessionId, status: "pending" },
      data: {
        status: "completed",
        completedAt: new Date(),
        // Record what Stripe actually charged, in case it ever diverges from
        // the catalog price we estimated at checkout time.
        ...(params.amountTotalCents != null ? { amountCents: params.amountTotalCents } : {}),
      },
    });

    if (flipped.count === 0) {
      return { credited: false, userId: purchase.userId, neuronAmount: purchase.neuronAmount };
    }

    await tx.neuronTransaction.create({
      data: {
        userId: purchase.userId,
        type: "purchase",
        amount: purchase.neuronAmount,
        // Reuse the traceability field to record which package -- same
        // "plain String, not an enum" stance as the rest of this ledger.
        gameKey: purchase.packageKey,
      },
    });
    await tx.user.update({
      where: { id: purchase.userId },
      data: { neuronsBalance: { increment: purchase.neuronAmount } },
    });

    return { credited: true, userId: purchase.userId, neuronAmount: purchase.neuronAmount };
  });
}
