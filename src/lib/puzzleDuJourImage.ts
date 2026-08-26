import { openai } from "@/lib/openai";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Deliberately self-contained rather than sharing code with
// src/lib/puzzleImage.ts ("Puzzle Mode", the per-quiz jigsaw-reveal
// feature) -- Puzzle du Jour is a separate Pro daily game with its own
// bucket, and keeping this module fully isolated means nothing here can
// ever regress Puzzle Mode in production.
const PUZZLE_DU_JOUR_BUCKET = "puzzle-du-jour-images";
// See puzzleImage.ts's own comment: `dall-e-3` isn't provisioned on newer
// OpenAI accounts, `gpt-image-1` is the safe baseline across tiers.
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

export type PuzzleDuJourImageErrorCode =
  /** Storage is misconfigured -- an operator has to fix it, retrying won't. */
  | "PUZZLE_DU_JOUR_IMAGE_STORAGE_UNAVAILABLE"
  /** OpenAI (or the download of its result) failed -- usually transient. */
  | "PUZZLE_DU_JOUR_IMAGE_GENERATION_FAILED";

export class PuzzleDuJourImageError extends Error {
  readonly code: PuzzleDuJourImageErrorCode;

  constructor(code: PuzzleDuJourImageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PuzzleDuJourImageError";
    this.code = code;
  }
}

/**
 * True for OpenAI's moderation rejection on images.generate -- the user's
 * fault for picking a disallowed topic, not a transient failure. Callers
 * must NOT count this attempt against the daily limit and should surface a
 * "pick another topic" message instead of retrying.
 */
export function isContentPolicyViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: unknown; status?: unknown; error?: { code?: unknown }; message?: unknown };
  const code = err.code ?? err.error?.code;
  if (code === "content_policy_violation" || code === "moderation_blocked") return true;
  const message = String(err.message ?? "");
  return err.status === 400 && /content_policy|safety system|moderation/i.test(message);
}

/**
 * Supabase Storage reports failures as `{ message, status, statusCode }`
 * where `statusCode` is a *string* and `status` is the transport status --
 * a 403 arrives as `status: 400, statusCode: "403"`. Read both so callers
 * can tell "not found" from "not allowed".
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
    `[puzzleDuJourImage] Supabase Storage ${stage} failed for bucket "${PUZZLE_DU_JOUR_BUCKET}" ` +
      `(status ${code ?? "?"}): ${message}`
  );

  if (code === 403 || /row-level security|unauthorized|permission/i.test(message)) {
    // The overwhelmingly common cause: SUPABASE_SERVICE_ROLE_KEY holds a
    // publishable/anon key. Those are subject to RLS, so every write to
    // storage.buckets is refused -- which surfaces here, not at startup.
    console.error(
      "[puzzleDuJourImage] HOW TO FIX: SUPABASE_SERVICE_ROLE_KEY is being rejected by row-level " +
        "security, which means it is not a service-role key. In the Supabase dashboard go to " +
        "Project Settings -> API Keys, copy the SECRET key (it starts with `sb_secret_`; a key " +
        "starting with `sb_publishable_` or the anon JWT will not work), and set it as " +
        "SUPABASE_SERVICE_ROLE_KEY. Then create a PUBLIC bucket named " +
        `"${PUZZLE_DU_JOUR_BUCKET}" under Storage -> New bucket.`
    );
  } else if (code === 404) {
    console.error(
      `[puzzleDuJourImage] HOW TO FIX: create a PUBLIC bucket named "${PUZZLE_DU_JOUR_BUCKET}" in the ` +
        "Supabase dashboard (Storage -> New bucket -> tick \"Public bucket\"), or run:\n" +
        `  insert into storage.buckets (id, name, public) values ('${PUZZLE_DU_JOUR_BUCKET}', '${PUZZLE_DU_JOUR_BUCKET}', true);`
    );
  }
}

/**
 * Verified once per server process rather than once per game -- see
 * puzzleImage.ts's identical rationale. The promise is the cache:
 * concurrent callers share one check instead of racing to create the same
 * bucket.
 */
let bucketReady: Promise<void> | null = null;

function ensurePuzzleDuJourBucketReady(): Promise<void> {
  if (!bucketReady) {
    bucketReady = verifyPuzzleDuJourBucket().catch((error) => {
      // Deliberately not caching the failure -- a wrong key or a missing
      // bucket is fixed in the dashboard without redeploying.
      bucketReady = null;
      throw error;
    });
  }
  return bucketReady;
}

async function verifyPuzzleDuJourBucket(): Promise<void> {
  const storage = getSupabaseAdmin().storage;

  const { error: getError } = await storage.getBucket(PUZZLE_DU_JOUR_BUCKET);
  if (!getError) return;

  // Missing bucket: try to self-provision. This succeeds only with a real
  // service-role key, which is exactly the credential we need anyway.
  const { error: createError } = await storage.createBucket(PUZZLE_DU_JOUR_BUCKET, { public: true });

  if (!createError) {
    console.info(`[puzzleDuJourImage] created public storage bucket "${PUZZLE_DU_JOUR_BUCKET}"`);
    return;
  }

  if (storageErrorMessage(createError).toLowerCase().includes("already exists")) {
    return;
  }

  logStorageRemediation("bucket provisioning", createError);
  throw new PuzzleDuJourImageError(
    "PUZZLE_DU_JOUR_IMAGE_STORAGE_UNAVAILABLE",
    `Puzzle du jour image bucket "${PUZZLE_DU_JOUR_BUCKET}" is unavailable: ${storageErrorMessage(createError)}`,
    { cause: createError }
  );
}

async function renderTopicImage(topic: string): Promise<Buffer> {
  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt:
      `Vibrant, colorful digital illustration representing the topic "${topic}". ` +
      "No text, no letters, no watermarks -- clear, well-lit imagery well suited to a jigsaw puzzle.",
    size: "1024x1024",
    quality: "high",
    n: 1,
  });

  // The two model families answer differently: `dall-e-*` returns a short-
  // lived `url`, `gpt-image-*` always returns `b64_json` and never a url.
  // Accept either so OPENAI_IMAGE_MODEL can point at either family.
  const image = response.data?.[0];

  // Buffer, not `.buffer` -- Node pools small allocations, so the backing
  // ArrayBuffer can be larger than the image and shared with other data.
  if (image?.b64_json) {
    return Buffer.from(image.b64_json, "base64");
  }

  if (!image?.url) {
    throw new PuzzleDuJourImageError(
      "PUZZLE_DU_JOUR_IMAGE_GENERATION_FAILED",
      `OpenAI returned neither image data nor a URL for model "${IMAGE_MODEL}"`
    );
  }

  const imageResponse = await fetch(image.url);
  if (!imageResponse.ok) {
    throw new PuzzleDuJourImageError(
      "PUZZLE_DU_JOUR_IMAGE_GENERATION_FAILED",
      `Failed to download generated puzzle du jour image: ${imageResponse.status}`
    );
  }

  return Buffer.from(await imageResponse.arrayBuffer());
}

/**
 * Generates a topic-themed image for Puzzle du Jour and persists it to
 * Supabase Storage under the requesting user's own prefix (so a listing
 * can be scoped/audited per user despite the bucket being public). OpenAI's
 * own image URLs expire after about an hour, but a puzzle game needs its
 * image to keep resolving indefinitely.
 *
 * Throws {@link PuzzleDuJourImageError} for storage/generation failures --
 * check `.code`. A moderation rejection is thrown as the raw OpenAI error
 * instead (not wrapped); check it with {@link isContentPolicyViolation}
 * before treating it as a retryable failure.
 */
export async function generatePuzzleDuJourImage(userId: string, topic: string): Promise<string> {
  // Storage first, on purpose. Generating the image costs real money, so
  // there is no point buying one we already know we cannot store.
  await ensurePuzzleDuJourBucketReady();

  let imageBuffer: Buffer;
  try {
    imageBuffer = await renderTopicImage(topic);
  } catch (error) {
    if (isContentPolicyViolation(error)) {
      // Let the caller see the original error so it can distinguish "topic
      // blocked" from every other failure -- don't relabel it.
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[puzzleDuJourImage] image generation failed (model "${IMAGE_MODEL}"):`, error);

    if (/does not exist|model_not_found/i.test(message)) {
      console.error(
        `[puzzleDuJourImage] HOW TO FIX: the OpenAI key has no access to image model "${IMAGE_MODEL}". ` +
          "List what the key can actually use with " +
          "`curl https://api.openai.com/v1/models -H \"Authorization: Bearer $OPENAI_API_KEY\"` " +
          "and set OPENAI_IMAGE_MODEL to one of the image models it returns (e.g. gpt-image-1)."
      );
    }

    if (error instanceof PuzzleDuJourImageError) throw error;
    throw new PuzzleDuJourImageError(
      "PUZZLE_DU_JOUR_IMAGE_GENERATION_FAILED",
      `Image generation failed: ${message}`,
      { cause: error }
    );
  }

  const fileName = `${userId}/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await getSupabaseAdmin()
    .storage.from(PUZZLE_DU_JOUR_BUCKET)
    .upload(fileName, imageBuffer, { contentType: "image/png", upsert: false });

  if (uploadError) {
    logStorageRemediation("upload", uploadError);
    throw new PuzzleDuJourImageError(
      "PUZZLE_DU_JOUR_IMAGE_STORAGE_UNAVAILABLE",
      `Failed to store puzzle du jour image: ${storageErrorMessage(uploadError)}`,
      { cause: uploadError }
    );
  }

  const { data } = getSupabaseAdmin().storage.from(PUZZLE_DU_JOUR_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}
