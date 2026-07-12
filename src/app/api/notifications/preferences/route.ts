import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

const preferencesSchema = z.object({
  streakReminderEmail: z.boolean().optional(),
  dailyChallengeEmail: z.boolean().optional(),
  weeklySummaryEmail: z.boolean().optional(),
});

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preference = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
    select: { streakReminderEmail: true, dailyChallengeEmail: true, weeklySummaryEmail: true },
  });

  // No row yet means the user has never touched their preferences --
  // everything defaults to on, matching the schema's column defaults.
  return NextResponse.json(
    preference ?? { streakReminderEmail: true, dailyChallengeEmail: true, weeklySummaryEmail: true }
  );
}

export async function PATCH(req: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = preferencesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
    select: { streakReminderEmail: true, dailyChallengeEmail: true, weeklySummaryEmail: true },
  });

  return NextResponse.json(updated);
}
