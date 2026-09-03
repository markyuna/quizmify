import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/site";
import { getNeuronPackage, isNeuronPackageKey } from "@/lib/neurons/shop";
import { isEffectivelyPro } from "@/lib/paywall";

/**
 * Opens a Stripe Checkout session for one Neuron package and records a
 * `pending` NeuronPurchase row keyed on the session id. The webhook
 * (POST /api/stripe/webhook, branched on metadata.kind === "neuron_purchase")
 * flips that row to `completed` and credits the Neurons.
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (!isNeuronPackageKey(body?.packageKey)) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }
    const packageKey = body.packageKey;
    const pkg = getNeuronPackage(packageKey);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        premiumUntil: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Pro accounts already have unlimited access to every Neuron-gated game
    // (Morpion/Akinator skip the per-play debit, Puzzle du Jour runs on the
    // Pro daily allowance), so they have nothing to spend Neurons on --
    // selling them a pack would be selling something unusable. Mirrors
    // PRO_DOES_NOT_NEED_UNLOCK in POST /api/neurons/unlock. This gate is at
    // checkout *start* only: a purchase begun while free and paid after
    // upgrading still credits normally -- the webhook and
    // creditNeuronsForPurchase are deliberately left untouched.
    if (isEffectivelyPro(user)) {
      return NextResponse.json({ error: "PRO_DOES_NOT_NEED_NEURONS" }, { status: 400 });
    }

    // Reuse the same Stripe customer the Pro flow creates, so a user's
    // purchases and subscription live under one customer.
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = getSiteUrl();

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${pkg.neurons} Neuronas 🧠`,
              description: "Moneda virtual para juegos en Quizmify",
            },
            unit_amount: pkg.amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/history?tab=neurons&purchase=success`,
      cancel_url: `${baseUrl}/history?tab=neurons&purchase=canceled`,
      metadata: {
        kind: "neuron_purchase",
        userId: user.id,
        packageKey,
        neurons: String(pkg.neurons),
      },
    });

    await prisma.neuronPurchase.create({
      data: {
        userId: user.id,
        stripeSessionId: checkoutSession.id,
        packageKey,
        neuronAmount: pkg.neurons,
        amountCents: pkg.amountCents,
        currency: "EUR",
        status: "pending",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("POST /api/checkout/neurons error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
