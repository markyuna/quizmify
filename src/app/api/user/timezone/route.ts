import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

const timezoneSchema = z.object({
  timezone: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = timezoneSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  // Reject anything that isn't a real IANA zone rather than trusting the
  // client string as-is -- Intl throws on unrecognized zone names.
  try {
    Intl.DateTimeFormat(undefined, { timeZone: parsed.data.timezone });
  } catch {
    return NextResponse.json({ error: "Unrecognized timezone" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { timezone: parsed.data.timezone },
  });

  return NextResponse.json({ success: true });
}
