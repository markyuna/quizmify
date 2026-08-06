import { openai } from "@/lib/openai";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PUZZLE_BUCKET = "puzzle-images";
// `dall-e-3` is NOT a safe default: newer OpenAI accounts are provisioned
// without it and reject it with "The model 'dall-e-3' does not exist",
// which is what broke Puzzle Mode. `gpt-image-1` is the baseline image
// model available across account tiers. Override with OPENAI_IMAGE_MODEL
// (e.g. `gpt-image-2`) where the key has something better.
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

export type PuzzleImageErrorCode =
  /** Storage is misconfigured -- an operator has to fix it, retrying won't. */
  | "PUZZLE_IMAGE_STORAGE_UNAVAILABLE"
  /** DALL-E (or the download of its result) failed -- usually transient. */
  | "PUZZLE_IMAGE_GENERATION_FAILED";

export class PuzzleImageError extends Error {
  readonly code: PuzzleImageErrorCode;

  constructor(code: PuzzleImageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PuzzleImageError";
    this.code = code;
  }
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
    `[puzzleImage] Supabase Storage ${stage} failed for bucket "${PUZZLE_BUCKET}" ` +
      `(status ${code ?? "?"}): ${message}`
  );

  if (code === 403 || /row-level security|unauthorized|permission/i.test(message)) {
    // The overwhelmingly common cause: SUPABASE_SERVICE_ROLE_KEY holds a
    // publishable/anon key. Those are subject to RLS, so every write to
    // storage.buckets is refused -- which surfaces here, not at startup.
    console.error(
      "[puzzleImage] HOW TO FIX: SUPABASE_SERVICE_ROLE_KEY is being rejected by row-level " +
        "security, which means it is not a service-role key. In the Supabase dashboard go to " +
        "Project Settings -> API Keys, copy the SECRET key (it starts with `sb_secret_`; a key " +
        "starting with `sb_publishable_` or the anon JWT will not work), and set it as " +
        "SUPABASE_SERVICE_ROLE_KEY. Then create a PUBLIC bucket named " +
        `"${PUZZLE_BUCKET}" under Storage -> New bucket.`
    );
  } else if (code === 404) {
    console.error(
      `[puzzleImage] HOW TO FIX: create a PUBLIC bucket named "${PUZZLE_BUCKET}" in the Supabase ` +
        "dashboard (Storage -> New bucket -> tick \"Public bucket\"), or run:\n" +
        `  insert into storage.buckets (id, name, public) values ('${PUZZLE_BUCKET}', '${PUZZLE_BUCKET}', true);`
    );
  }
}

/**
 * Verified once per server process rather than once per game.
 *
 * The bucket is operator-provisioned infrastructure, not per-request state,
 * so re-checking it on every puzzle quiz just added two round-trips to the
 * critical path. The promise is the cache: concurrent callers share one
 * check instead of racing to create the same bucket.
 */
let bucketReady: Promise<void> | null = null;

function ensurePuzzleBucketReady(): Promise<void> {
  if (!bucketReady) {
    bucketReady = verifyPuzzleBucket().catch((error) => {
      // Deliberately not caching the failure. A wrong key or a missing
      // bucket is fixed in the dashboard without redeploying, and the next
      // request should pick that fix up instead of serving a stale verdict
      // until someone restarts the server.
      bucketReady = null;
      throw error;
    });
  }
  return bucketReady;
}

async function verifyPuzzleBucket(): Promise<void> {
  const storage = getSupabaseAdmin().storage;

  const { error: getError } = await storage.getBucket(PUZZLE_BUCKET);
  if (!getError) return;

  // Missing bucket: try to self-provision. This succeeds only with a real
  // service-role key, which is exactly the credential we need anyway.
  const { error: createError } = await storage.createBucket(PUZZLE_BUCKET, { public: true });

  if (!createError) {
    console.info(`[puzzleImage] created public storage bucket "${PUZZLE_BUCKET}"`);
    return;
  }

  if (storageErrorMessage(createError).toLowerCase().includes("already exists")) {
    return;
  }

  logStorageRemediation("bucket provisioning", createError);
  throw new PuzzleImageError(
    "PUZZLE_IMAGE_STORAGE_UNAVAILABLE",
    `Puzzle image bucket "${PUZZLE_BUCKET}" is unavailable: ${storageErrorMessage(createError)}`,
    { cause: createError }
  );
}

async function renderTopicImage(topic: string): Promise<Buffer> {
  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt:
      `Vibrant, colorful digital illustration representing the topic "${topic}". ` +
      "No text, no letters, no watermarks -- pure imagery, well suited to a jigsaw puzzle reveal game.",
    size: "1024x1024",
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
    throw new PuzzleImageError(
      "PUZZLE_IMAGE_GENERATION_FAILED",
      `OpenAI returned neither image data nor a URL for model "${IMAGE_MODEL}"`
    );
  }

  const imageResponse = await fetch(image.url);
  if (!imageResponse.ok) {
    throw new PuzzleImageError(
      "PUZZLE_IMAGE_GENERATION_FAILED",
      `Failed to download generated puzzle image: ${imageResponse.status}`
    );
  }

  return Buffer.from(await imageResponse.arrayBuffer());
}

/**
 * Generates a topic-themed image with DALL-E and persists it to Supabase
 * Storage. OpenAI's own image URLs expire after about an hour, but a
 * puzzle game needs its image to keep resolving for as long as the game
 * (and any later replay of the result screen) exists.
 *
 * Throws {@link PuzzleImageError}; check `.code` to tell a storage
 * misconfiguration (operator has to act) from an image-generation failure
 * (worth retrying).
 */
export async function generatePuzzleImage(topic: string): Promise<string> {
  // Storage first, on purpose. Generating the image costs real money, so
  // there is no point buying one we already know we cannot store.
  await ensurePuzzleBucketReady();

  let imageBuffer: Buffer;
  try {
    imageBuffer = await renderTopicImage(topic);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[puzzleImage] image generation failed (model "${IMAGE_MODEL}"):`, error);

    if (/does not exist|model_not_found/i.test(message)) {
      console.error(
        `[puzzleImage] HOW TO FIX: the OpenAI key has no access to image model "${IMAGE_MODEL}". ` +
          "List what the key can actually use with " +
          "`curl https://api.openai.com/v1/models -H \"Authorization: Bearer $OPENAI_API_KEY\"` " +
          "and set OPENAI_IMAGE_MODEL to one of the image models it returns (e.g. gpt-image-1)."
      );
    }

    if (error instanceof PuzzleImageError) throw error;
    throw new PuzzleImageError(
      "PUZZLE_IMAGE_GENERATION_FAILED",
      `Image generation failed: ${message}`,
      { cause: error }
    );
  }

  const fileName = `${crypto.randomUUID()}.png`;
  const { error: uploadError } = await getSupabaseAdmin()
    .storage.from(PUZZLE_BUCKET)
    .upload(fileName, imageBuffer, { contentType: "image/png", upsert: false });

  if (uploadError) {
    logStorageRemediation("upload", uploadError);
    throw new PuzzleImageError(
      "PUZZLE_IMAGE_STORAGE_UNAVAILABLE",
      `Failed to store puzzle image: ${storageErrorMessage(uploadError)}`,
      { cause: uploadError }
    );
  }

  const { data } = getSupabaseAdmin().storage.from(PUZZLE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}
