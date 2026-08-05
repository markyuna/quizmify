import { openai } from "@/lib/openai";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PUZZLE_BUCKET = "puzzle-images";
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3";

// Lazily provisions the storage bucket on first use rather than requiring
// manual setup in the Supabase dashboard -- createBucket is idempotent
// enough for our purposes (a race just means one caller sees "already
// exists" and moves on).
async function ensurePuzzleBucketExists() {
  const { error } = await getSupabaseAdmin().storage.getBucket(PUZZLE_BUCKET);
  if (!error) return;

  const { error: createError } = await getSupabaseAdmin().storage.createBucket(PUZZLE_BUCKET, {
    public: true,
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(`Failed to create puzzle image bucket: ${createError.message}`);
  }
}

/**
 * Generates a topic-themed image with DALL-E and persists it to Supabase
 * Storage. OpenAI's own image URLs expire after about an hour, but a
 * puzzle game needs its image to keep resolving for as long as the game
 * (and any later replay of the result screen) exists.
 */
export async function generatePuzzleImage(topic: string): Promise<string> {
  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt:
      `Vibrant, colorful digital illustration representing the topic "${topic}". ` +
      "No text, no letters, no watermarks -- pure imagery, well suited to a jigsaw puzzle reveal game.",
    size: "1024x1024",
    n: 1,
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("OpenAI did not return a generated image URL");
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download generated puzzle image: ${imageResponse.status}`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();

  await ensurePuzzleBucketExists();

  const fileName = `${crypto.randomUUID()}.png`;
  const { error: uploadError } = await getSupabaseAdmin()
    .storage.from(PUZZLE_BUCKET)
    .upload(fileName, imageBuffer, { contentType: "image/png", upsert: false });

  if (uploadError) {
    throw new Error(`Failed to store puzzle image: ${uploadError.message}`);
  }

  const { data } = getSupabaseAdmin().storage.from(PUZZLE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}
