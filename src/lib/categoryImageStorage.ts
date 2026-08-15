import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const CATEGORY_IMAGES_BUCKET = "category-images";

/**
 * Same bucket + upload + public-URL pattern as puzzleImage.ts, minus the
 * DALL-E generation step -- category/personality-test images are static
 * assets we produce once (not per-request), so there's no "verify before
 * spending money" ordering concern here.
 *
 * HOW TO UPLOAD A NEW IMAGE (e.g. once the remaining category heroes are
 * generated):
 *   1. Save the optimized .webp locally (this project targets ~100-500KB,
 *      no on-the-fly resize -- see the design note below).
 *   2. Run a one-off script that imports uploadCategoryImage() from this
 *      file and calls it with the file's bytes and the target name
 *      ("{slug}-hero.webp" for categories, "animal-{name}.webp" for the
 *      personality test) -- see the migration script used to seed the
 *      first 24 images for a template.
 *   3. Copy the returned public URL into CATEGORIES in categories.ts (or
 *      QUEL_ANIMAL_ES_TU_IMAGES in quelAnimalEsTu.config.ts). No commit or
 *      redeploy needed for the upload itself, just for wiring the new URL
 *      into the data that references it.
 *
 * Design note: this project's Supabase plan has on-the-fly image
 * transformation disabled (confirmed via a direct GET against
 * /storage/v1/render/image/public/... -- it 403s with
 * {"error":"FeatureNotEnabled"}). Every image uploaded here is served
 * byte-for-byte as stored, so optimize/resize *before* uploading, not after.
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
    `[categoryImageStorage] Supabase Storage ${stage} failed for bucket "${CATEGORY_IMAGES_BUCKET}" ` +
      `(status ${code ?? "?"}): ${message}`
  );

  if (code === 403 || /row-level security|unauthorized|permission/i.test(message)) {
    console.error(
      "[categoryImageStorage] HOW TO FIX: SUPABASE_SERVICE_ROLE_KEY is being rejected by row-level " +
        "security, which means it is not a service-role key. In the Supabase dashboard go to " +
        "Project Settings -> API Keys, copy the SECRET key (it starts with `sb_secret_`; a key " +
        "starting with `sb_publishable_` or the anon JWT will not work), and set it as " +
        "SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}

let bucketReady: Promise<void> | null = null;

/** Verified once per server process -- see puzzleImage.ts's identical caching rationale. */
export function ensureCategoryImagesBucketReady(): Promise<void> {
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

  const { error: getError } = await storage.getBucket(CATEGORY_IMAGES_BUCKET);
  if (!getError) return;

  const { error: createError } = await storage.createBucket(CATEGORY_IMAGES_BUCKET, { public: true });

  if (!createError) {
    console.info(`[categoryImageStorage] created public storage bucket "${CATEGORY_IMAGES_BUCKET}"`);
    return;
  }

  if (storageErrorMessage(createError).toLowerCase().includes("already exists")) {
    return;
  }

  logStorageRemediation("bucket provisioning", createError);
  throw new Error(
    `Category images bucket "${CATEGORY_IMAGES_BUCKET}" is unavailable: ${storageErrorMessage(createError)}`
  );
}

export function getCategoryImagePublicUrl(fileName: string): string {
  const { data } = getSupabaseAdmin().storage.from(CATEGORY_IMAGES_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

/** Upserts by design -- re-running the migration script (or replacing a bad image) with the same fileName just overwrites it. */
export async function uploadCategoryImage(
  fileName: string,
  bytes: Buffer,
  contentType = "image/webp"
): Promise<string> {
  await ensureCategoryImagesBucketReady();

  const { error } = await getSupabaseAdmin()
    .storage.from(CATEGORY_IMAGES_BUCKET)
    .upload(fileName, bytes, { contentType, upsert: true });

  if (error) {
    logStorageRemediation("upload", error);
    throw new Error(`Failed to upload "${fileName}": ${storageErrorMessage(error)}`);
  }

  return getCategoryImagePublicUrl(fileName);
}
