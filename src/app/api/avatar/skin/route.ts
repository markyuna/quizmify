import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { isUserPro } from "@/lib/paywall";
import { AVATAR_SKINS } from "@/lib/avatarSkins";

const selectSkinSchema = z.object({
  skinId: z.string().min(1).nullable(),
});

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = selectSkinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { skinId } = parsed.data;

  // Un-equipping (null) is always allowed, even for a lapsed Pro user who's
  // holding a skin they can no longer apply.
  if (skinId !== null) {
    if (!AVATAR_SKINS.some((skin) => skin.id === skinId)) {
      return NextResponse.json({ error: "Unknown skin" }, { status: 400 });
    }

    // Server-side gate, not just a disabled button client-side.
    if (!(await isUserPro(session.user.id))) {
      return NextResponse.json({ error: "Pro required" }, { status: 403 });
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { selectedSkinId: skinId },
  });

  return NextResponse.json({ success: true, skinId });
}
