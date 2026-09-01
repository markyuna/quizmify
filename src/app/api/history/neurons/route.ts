import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

/**
 * The current user's Neuron-shop purchase receipts (NeuronPurchase rows).
 * The in-app ledger (/history?tab=neurons) already shows the resulting
 * `purchase` NeuronTransaction; this endpoint exposes the payment side
 * (EUR charged, pending/completed status) for a future receipts view.
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purchases = await prisma.neuronPurchase.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      packageKey: true,
      neuronAmount: true,
      amountCents: true,
      currency: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({ purchases });
}
