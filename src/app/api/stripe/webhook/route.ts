import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { creditNeuronsForPurchase } from "@/lib/neurons";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    // Neuron shop purchase -- crediting + idempotency live in
    // creditNeuronsForPurchase (keyed on the NeuronPurchase row).
    if (session.metadata?.kind === "neuron_purchase") {
      const result = await creditNeuronsForPurchase(prisma, {
        stripeSessionId: session.id,
        amountTotalCents: session.amount_total,
      });
      if (result.credited) {
        console.log(
          `Webhook: credited ${result.neuronAmount} neurons to ${result.userId} (session ${session.id})`
        );
      }
      return NextResponse.json({ received: true });
    }

    // Pro purchase -- `kind: "pro"`, or a session created before the kind
    // field existed (no kind => treat as Pro, for backwards compatibility
    // with any in-flight checkout).
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error("Webhook: no userId in session metadata", session.id);
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: "pro",
        stripePaymentId: session.id,
        stripeCustomerId: session.customer as string,
      },
    });
  }

  return NextResponse.json({ received: true });
}
