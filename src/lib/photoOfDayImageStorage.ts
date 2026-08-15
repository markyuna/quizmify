import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const PHOTO_OF_DAY_IMAGES_BUCKET = "photo-du-jour-images";

/**
 * Same bucket + upload + public-URL pattern as categoryImageStorage.ts /
 * puzzleImage.ts, for the Photo du Jour landmark photos (see PHOTOS in
 * src/lib/games/photoOfDay.ts). Static assets uploaded once, not per-request
 * -- adding a new location is: save the optimized .webp, upload it with
 * this helper (or the one-off migration script's pattern), then add a
 * PHOTOS entry pointing at the returned public URL. No commit/redeploy
 * needed for the upload itself.
 *
 * Same plan limitation as categoryImageStorage.ts: this project's Supabase
 * tier has on-the-fly image transformation disabled, so upload already-
 * optimized bytes -- nothing resizes them after the fact.
 */

function storageErrorCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const { statusCode, status } = error as { statusCode?: unknown; status?: unknown };
  const parsed = Number(statusCode ?? status);
  return Number.isFinite(parsed) ? parsed : null;
}

function storageErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}

function logStorageRemediation(stage: string, error: unknown) {
  const code = storageErrorCode(error);
  const message = storageErrorMessage(error);

  console.error(
    `[photoOfDayImageStorage] Supabase Storage ${stage} failed for bucket "${PHOTO_OF_DAY_IMAGES_BUCKET}" ` +
      `(status ${code ?? "?"}): ${message}`
  );

  if (code === 403 || /row-level security|unauthorized|permission/i.test(message)) {
    console.error(
      "[photoOfDayImageStorage] HOW TO FIX: SUPABASE_SERVICE_ROLE_KEY is being rejected by row-level " +
        "security, which means it is not a service-role key. In the Supabase dashboard go to " +
        "Project Settings -> API Keys, copy the SECRET key (it starts with `sb_secret_`; a key " +
        "starting with `sb_publishable_` or the anon JWT will not work), and set it as " +
        "SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}

let bucketReady: Promise<void> | null = null;

/** Verified once per server process -- see categoryImageStorage.ts's identical caching rationale. */
export function ensurePhotoOfDayImagesBucketReady(): Promise<void> {
  if (!bucketReady) {
    bucketReady = verifyBucket().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }
  return bucketReady;
}

async function verifyBucket(): Promise<void> {
  const storage = getSupabaseAdmin().storage;

  const { error: getError } = await storage.getBucket(PHOTO_OF_DAY_IMAGES_BUCKET);
  if (!getError) return;

  const { error: createError } = await storage.createBucket(PHOTO_OF_DAY_IMAGES_BUCKET, { public: true });

  if (!createError) {
    console.info(`[photoOfDayImageStorage] created public storage bucket "${PHOTO_OF_DAY_IMAGES_BUCKET}"`);
    return;
  }

  if (storageErrorMessage(createError).toLowerCase().includes("already exists")) {
    return;
  }

  logStorageRemediation("bucket provisioning", createError);
  throw new Error(
    `Photo du Jour images bucket "${PHOTO_OF_DAY_IMAGES_BUCKET}" is unavailable: ${storageErrorMessage(createError)}`
  );
}

export function getPhotoOfDayImagePublicUrl(fileName: string): string {
  const { data } = getSupabaseAdmin().storage.from(PHOTO_OF_DAY_IMAGES_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

/** Upserts by design -- re-running the migration script (or replacing a bad photo) with the same fileName just overwrites it. */
export async function uploadPhotoOfDayImage(
  fileName: string,
  bytes: Buffer,
  contentType = "image/webp"
): Promise<string> {
  await ensurePhotoOfDayImagesBucketReady();

  const { error } = await getSupabaseAdmin()
    .storage.from(PHOTO_OF_DAY_IMAGES_BUCKET)
    .upload(fileName, bytes, { contentType, upsert: true });

  if (error) {
    logStorageRemediation("upload", error);
    throw new Error(`Failed to upload "${fileName}": ${storageErrorMessage(error)}`);
  }

  return getPhotoOfDayImagePublicUrl(fileName);
}
