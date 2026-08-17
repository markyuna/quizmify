import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const CURATED_QUIZ_IMAGES_BUCKET = "curated-quiz-images";

/**
 * Same bucket + upload + public-URL pattern as photoOfDayImageStorage.ts /
 * categoryImageStorage.ts, but shared across every curated quiz topic
 * instead of one bucket per feature -- each topic gets its own subfolder
 * (e.g. "qui-est-le-peintre/nuit-etoilee.webp", see
 * src/lib/curatedQuizzes/quiEstLePeintre.ts) so a new curated topic never
 * needs a new bucket, just a new folder + a new CuratedQuizDefinition.
 *
 * Same on-the-fly-transformation limitation as the other *ImageStorage.ts
 * helpers in this project: upload already-optimized .webp bytes, nothing
 * resizes them after the fact.
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
    `[curatedQuizImageStorage] Supabase Storage ${stage} failed for bucket "${CURATED_QUIZ_IMAGES_BUCKET}" ` +
      `(status ${code ?? "?"}): ${message}`
  );

  if (code === 403 || /row-level security|unauthorized|permission/i.test(message)) {
    console.error(
      "[curatedQuizImageStorage] HOW TO FIX: SUPABASE_SERVICE_ROLE_KEY is being rejected by row-level " +
        "security, which means it is not a service-role key. In the Supabase dashboard go to " +
        "Project Settings -> API Keys, copy the SECRET key (it starts with `sb_secret_`; a key " +
        "starting with `sb_publishable_` or the anon JWT will not work), and set it as " +
        "SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}

let bucketReady: Promise<void> | null = null;

/** Verified once per server process -- see categoryImageStorage.ts's identical caching rationale. */
export function ensureCuratedQuizImagesBucketReady(): Promise<void> {
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

  const { error: getError } = await storage.getBucket(CURATED_QUIZ_IMAGES_BUCKET);
  if (!getError) return;

  const { error: createError } = await storage.createBucket(CURATED_QUIZ_IMAGES_BUCKET, { public: true });

  if (!createError) {
    console.info(`[curatedQuizImageStorage] created public storage bucket "${CURATED_QUIZ_IMAGES_BUCKET}"`);
    return;
  }

  if (storageErrorMessage(createError).toLowerCase().includes("already exists")) {
    return;
  }

  logStorageRemediation("bucket provisioning", createError);
  throw new Error(
    `Curated quiz images bucket "${CURATED_QUIZ_IMAGES_BUCKET}" is unavailable: ${storageErrorMessage(createError)}`
  );
}

export function getCuratedQuizImagePublicUrl(folder: string, fileName: string): string {
  const { data } = getSupabaseAdmin()
    .storage.from(CURATED_QUIZ_IMAGES_BUCKET)
    .getPublicUrl(`${folder}/${fileName}`);
  return data.publicUrl;
}

/** Upserts by design -- re-running an upload script with the same folder+fileName just overwrites it. */
export async function uploadCuratedQuizImage(
  folder: string,
  fileName: string,
  bytes: Buffer,
  contentType = "image/webp"
): Promise<string> {
  await ensureCuratedQuizImagesBucketReady();

  const path = `${folder}/${fileName}`;
  const { error } = await getSupabaseAdmin()
    .storage.from(CURATED_QUIZ_IMAGES_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });

  if (error) {
    logStorageRemediation("upload", error);
    throw new Error(`Failed to upload "${path}": ${storageErrorMessage(error)}`);
  }

  return getCuratedQuizImagePublicUrl(folder, fileName);
}
