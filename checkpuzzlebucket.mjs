// Smoke test for the riskiest part of Puzzle Mode: whether the service-role
// key can create the storage bucket and upload to it. Costs nothing -- no
// OpenAI call, no DB write.
//
// Run from the repo root with Node 22+:
//   node --env-file=.env checkpuzzlebucket.mjs

import { createClient } from "@supabase/supabase-js";

const BUCKET = "puzzle-images";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. Does the bucket already exist?
const { error: getErr } = await supabase.storage.getBucket(BUCKET);

if (getErr) {
  console.log(`· bucket "${BUCKET}" not found (${getErr.message}) — trying to create it`);

  const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });

  if (createErr && !createErr.message.toLowerCase().includes("already exists")) {
    // supabase-js reports a 403 as `status: 400, statusCode: "403"`, so print
    // both -- the message alone reads like a generic bad request.
    console.error(
      `✗ CANNOT CREATE BUCKET: ${createErr.message} ` +
        `(status ${createErr.status}, statusCode ${createErr.statusCode})`
    );
    console.error("  → This is the failure that surfaces as PUZZLE_IMAGE_STORAGE_UNAVAILABLE.");
    if (/row-level security|unauthorized/i.test(createErr.message)) {
      console.error("  → Cause: SUPABASE_SERVICE_ROLE_KEY is NOT a service-role key. A");
      console.error("    publishable key (sb_publishable_…) or the anon JWT is subject to RLS,");
      console.error("    so every write to storage.buckets is refused.");
      console.error("  → Fix: Project Settings → API Keys → copy the SECRET key (sb_secret_…)");
      console.error("    and set it as SUPABASE_SERVICE_ROLE_KEY.");
    } else {
      console.error('  → Fix: create a public bucket named "puzzle-images" by hand in the');
      console.error("    Supabase dashboard (Storage → New bucket → Public).");
    }
    process.exit(1);
  }
  console.log("✓ bucket created");
} else {
  console.log(`✓ bucket "${BUCKET}" already exists`);
}

// 2. Can we upload to it? (1x1 transparent PNG)
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);
const name = `smoke-test-${Date.now()}.png`;

const { error: upErr } = await supabase.storage
  .from(BUCKET)
  .upload(name, png, { contentType: "image/png", upsert: false });

if (upErr) {
  console.error(`✗ CANNOT UPLOAD: ${upErr.message}`);
  process.exit(1);
}
console.log("✓ upload succeeded");

// 3. Is the public URL actually reachable? A private bucket returns 400/404
//    here, which would render as a broken puzzle image in the game.
const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
const res = await fetch(data.publicUrl);

console.log(
  res.ok
    ? `✓ public URL reachable (${res.status})`
    : `✗ PUBLIC URL NOT REACHABLE (${res.status}) — bucket is probably not public`
);
console.log(`  ${data.publicUrl}`);

// 4. Clean up.
await supabase.storage.from(BUCKET).remove([name]);
console.log("✓ cleaned up test file");
console.log(res.ok ? "\nAll good — Puzzle Mode's storage path works." : "\nStorage path is broken, see above.");
