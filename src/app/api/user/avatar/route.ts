import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { QUEL_ANIMAL_ES_TU_IMAGES, isAnimalKey } from "@/lib/personalityTests/quelAnimalEsTu.config";
import {
  AVATAR_MAX_BYTES,
  deleteAvatarFile,
  detectAvatarImageType,
  ownedAvatarPath,
  resolveGoogleImage,
  uploadAvatar,
} from "@/lib/profilePhoto";

// Profile photo (User.image), open to every user -- see src/lib/profilePhoto.ts.
//   POST   multipart `file`              -> upload a custom photo
//   PATCH  { source: "mascot"|"google" } -> use the assigned mascot / Google picture
//   DELETE                               -> back to the initial avatar
// The client never sends a URL: the mascot and Google pictures are resolved
// server-side from the user's own row, so nobody can pick a mascot they
// weren't assigned.
const sourceSchema = z.object({
  source: z.enum(["mascot", "google"]),
});

type CurrentPhoto = { image: string | null; googleImage: string | null; personalityAnimal: string | null };

async function loadCurrent(userId: string): Promise<CurrentPhoto | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { image: true, googleImage: true, personalityAnimal: true },
  });
}

/**
 * Writes the new image, capturing the Google picture into googleImage first
 * if it's only ever lived in `image` (so it stays restorable), then removes
 * the previous upload if it's being replaced.
 */
async function setImage(userId: string, current: CurrentPhoto, image: string | null) {
  await prisma.user.update({
    where: { id: userId },
    data: { image, googleImage: resolveGoogleImage(current) },
  });

  const previousPath = ownedAvatarPath(current.image, userId);
  if (previousPath && previousPath !== ownedAvatarPath(image, userId)) {
    await deleteAvatarFile(previousPath);
  }

  return NextResponse.json({ image });
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectAvatarImageType(bytes);
  if (!type) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  }

  const current = await loadCurrent(session.user.id);
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url: string;
  try {
    url = await uploadAvatar(session.user.id, bytes, type);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  return setImage(session.user.id, current, url);
}

export async function PATCH(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = sourceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const current = await loadCurrent(session.user.id);
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (parsed.data.source === "mascot") {
    const animal = current.personalityAnimal;
    if (!animal || !isAnimalKey(animal)) {
      return NextResponse.json({ error: "No mascot assigned" }, { status: 409 });
    }
    return setImage(session.user.id, current, QUEL_ANIMAL_ES_TU_IMAGES[animal]);
  }

  const googleImage = resolveGoogleImage(current);
  if (!googleImage) {
    return NextResponse.json({ error: "No Google photo" }, { status: 409 });
  }
  return setImage(session.user.id, current, googleImage);
}

export async function DELETE() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const current = await loadCurrent(session.user.id);
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return setImage(session.user.id, current, null);
}
