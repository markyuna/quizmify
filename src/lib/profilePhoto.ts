import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Profile photo (User.image) plumbing shared by /api/user/avatar and the
 * NextAuth Google sign-in hook. A user's photo is one of:
 *   - an upload, stored in the public `avatars` Supabase Storage bucket at
 *     `<userId>/<timestamp>.<ext>` (unique per upload, so no CDN staleness);
 *   - their assigned personality mascot (QUEL_ANIMAL_ES_TU_IMAGES);
 *   - their Google picture (User.googleImage);
 *   - nothing (null), which falls back to the initial avatar.
 *
 * The `avatars` bucket is operator-provisioned (public, 2 MB limit, jpeg/png/
 * webp only) -- unlike puzzleImage.ts there's no self-provisioning here.
 */
export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarImageType = (typeof AVATAR_ALLOWED_TYPES)[number];

const EXTENSIONS: Record<AvatarImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Sniffs the real image type from the file's magic bytes -- the browser-
 * reported MIME type and file extension are both client-controlled.
 */
export function detectAvatarImageType(bytes: Uint8Array): AvatarImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

function avatarPublicPrefix(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/`;
}

/** Storage path of an uploaded photo owned by `userId`, or null for any other URL. */
export function ownedAvatarPath(imageUrl: string | null | undefined, userId: string): string | null {
  if (!imageUrl) return null;
  const prefix = avatarPublicPrefix();
  if (!imageUrl.startsWith(prefix)) return null;
  const path = imageUrl.slice(prefix.length);
  return path.startsWith(`${userId}/`) ? path : null;
}

export function isGoogleImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith(".googleusercontent.com");
  } catch {
    return false;
  }
}

/**
 * The Google picture to offer as "restore", backfilling from `image` for
 * accounts whose googleImage hasn't been captured yet.
 */
export function resolveGoogleImage(user: { image: string | null; googleImage: string | null }): string | null {
  if (user.googleImage) return user.googleImage;
  return isGoogleImageUrl(user.image) ? user.image : null;
}

export async function uploadAvatar(userId: string, bytes: Uint8Array, type: AvatarImageType): Promise<string> {
  const path = `${userId}/${Date.now()}.${EXTENSIONS[type]}`;
  const storage = getSupabaseAdmin().storage.from(AVATAR_BUCKET);

  const { error } = await storage.upload(path, bytes, { contentType: type, upsert: false });
  if (error) {
    throw new Error(`[profilePhoto] upload to "${AVATAR_BUCKET}" failed: ${error.message}`);
  }

  return storage.getPublicUrl(path).data.publicUrl;
}

/** Best-effort cleanup of a replaced upload -- a leftover file is harmless. */
export async function deleteAvatarFile(path: string | null): Promise<void> {
  if (!path) return;
  const { error } = await getSupabaseAdmin().storage.from(AVATAR_BUCKET).remove([path]);
  if (error) {
    console.warn(`[profilePhoto] could not delete "${path}": ${error.message}`);
  }
}
