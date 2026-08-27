import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { isEffectivelyPro } from "@/lib/paywall";
import { NEURON_UNLOCK_COSTS, isNeuronUnlockGameKey } from "@/lib/neurons/costs";

const unlockSchema = z.object({ gameKey: z.string().min(1) });

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid data", 400);
  }

  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid data", 400);

  const { gameKey } = parsed.data;
  if (!isNeuronUnlockGameKey(gameKey)) {
    return jsonError("UNKNOWN_GAME_KEY", 404);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, premiumUntil: true },
  });
  if (!user) return jsonError("Unauthorized", 401);

  // Pro already has unlimited access -- spending Neurons on a ticket they
  // don't need would just be a silent waste of balance.
  if (isEffectivelyPro(user)) {
    return jsonError("PRO_DOES_NOT_NEED_UNLOCK", 400);
  }

  const cost = NEURON_UNLOCK_COSTS[gameKey];

  const unlock = await prisma.$transaction(async (tx) => {
    // Atomic, conditioned decrement -- updateMany (not update) so the
    // WHERE clause can require sufficient balance in the same statement,
    // instead of a read-then-write that could race with another spend.
    // affected count of 0 means "insufficient balance", not an error.
    const decrement = await tx.user.updateMany({
      where: { id: userId, neuronsBalance: { gte: cost } },
      data: { neuronsBalance: { decrement: cost } },
    });

    if (decrement.count === 0) return null;

    await tx.neuronTransaction.create({
      data: { userId, type: "spend_unlock", amount: -cost, gameKey },
    });

    return tx.neuronUnlock.create({
      data: { userId, gameKey, status: "available" },
    });
  });

  if (!unlock) {
    return jsonError("INSUFFICIENT_NEURONS", 402);
  }

  return NextResponse.json({ success: true, unlockId: unlock.id, gameKey, cost });
}
