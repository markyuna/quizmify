// One-off CategoryTopic seed for "sports": football topics folded into the
// sports category after the standalone "football" category was removed
// (see next.config.ts's /quiz/categoria/football -> /quiz/categoria/sports
// redirect). 3 topics x 3 languages (fr/es/en), 9 rows, native per-language
// -- same policy as the arts/sciences seeds. Brings sports from 12 to 21.
//
// Safe to re-run: ON CONFLICT DO NOTHING on the
// [categorySlug, topicNormalized, language] unique constraint.
//
// Run: node scripts/seed-sports-football-topics.mjs
import "dotenv/config";
import pg from "pg";
import crypto from "crypto";

const TOPICS = [
  { es: "Fútbol", fr: "Le football", en: "Football", difficulty: "easy" },
  { es: "Leyendas del fútbol", fr: "Les légendes du football", en: "Football legends", difficulty: "medium" },
  { es: "Tácticas y estrategias del fútbol", fr: "Tactiques et stratégies du football", en: "Football tactics and strategies", difficulty: "hard" },
];

// Same trim/collapse-whitespace rule as src/lib/topicUtils.ts's normalizeTopic.
function normalizeTopic(topic) {
  return topic.trim().replace(/\s+/g, " ");
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const rows = TOPICS.flatMap((topic) =>
  ["fr", "es", "en"].map((language) => ({
    id: crypto.randomUUID(),
    categorySlug: "sports",
    topicDisplay: topic[language],
    topicNormalized: normalizeTopic(topic[language]),
    language,
    difficulty: topic.difficulty,
  }))
);

const client = new pg.Client({ connectionString });
await client.connect();

let inserted = 0;
try {
  await client.query("BEGIN");

  for (const row of rows) {
    const result = await client.query(
      `INSERT INTO "CategoryTopic" (id, "categorySlug", "topicDisplay", "topicNormalized", language, difficulty, "createdAt", hidden, "createdByGameId")
       VALUES ($1, $2, $3, $4, $5, $6, now(), false, NULL)
       ON CONFLICT ("categorySlug", "topicNormalized", language) DO NOTHING`,
      [row.id, row.categorySlug, row.topicDisplay, row.topicNormalized, row.language, row.difficulty]
    );
    inserted += result.rowCount;
  }

  await client.query("COMMIT");
  console.log(`Inserted ${inserted}/${rows.length} rows (skipped rows already existed).`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Seed failed, rolled back:", error.message);
  process.exit(1);
}

const counts = await client.query(
  `SELECT language, count(*)::int AS n FROM "CategoryTopic" WHERE "categorySlug" = 'sports' GROUP BY language ORDER BY language`
);
console.log("Post-seed counts for sports:", counts.rows);

await client.end();
