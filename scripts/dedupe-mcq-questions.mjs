// One-off cleanup: removes duplicate rows from mcq_questions.
// Duplicates = same (topic lowercased, language, difficulty, question text
// lowercased). Keeps the oldest row of each group, deletes the rest.
//
// Run:            node scripts/dedupe-mcq-questions.mjs --dry-run
// Actually delete: node scripts/dedupe-mcq-questions.mjs
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars (URL / service role key).");
  process.exit(1);
}

const supabase = createClient(url, key);
const dryRun = process.argv.includes("--dry-run");

const { data, error } = await supabase
  .from("mcq_questions")
  .select("id, topic, language, difficulty, question, created_at")
  .order("created_at", { ascending: true });

if (error) {
  console.error("Fetch error:", error.message);
  process.exit(1);
}

const seen = new Map();
const toDelete = [];

for (const row of data) {
  const groupKey = [
    row.topic.trim().toLowerCase(),
    row.language,
    row.difficulty,
    row.question.trim().toLowerCase(),
  ].join("||");

  if (seen.has(groupKey)) {
    toDelete.push(row.id);
  } else {
    seen.set(groupKey, row.id);
  }
}

console.log(`Total rows: ${data.length}`);
console.log(`Unique questions: ${seen.size}`);
console.log(`Duplicate rows to delete: ${toDelete.length}`);

if (dryRun || toDelete.length === 0) {
  console.log(dryRun ? "Dry run -- nothing deleted." : "Nothing to delete.");
  process.exit(0);
}

// Delete in chunks to stay under URL length limits.
for (let i = 0; i < toDelete.length; i += 100) {
  const chunk = toDelete.slice(i, i + 100);
  const { error: delError } = await supabase.from("mcq_questions").delete().in("id", chunk);

  if (delError) {
    console.error("Delete error:", delError.message);
    process.exit(1);
  }

  console.log(`Deleted ${Math.min(i + 100, toDelete.length)}/${toDelete.length}`);
}

console.log("Done.");
