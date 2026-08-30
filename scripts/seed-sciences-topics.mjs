// One-off CategoryTopic seed for "sciences": 7 topics x 3 languages (fr/es/en),
// 21 rows, native per-language (not fr-only + lazy-translate) -- same policy
// as the arts/france/geographie seeds. Brings sciences from 4 to 25 total
// rows, in line with alimentation/disney/drapeaux (28-30).
//
// Safe to re-run: ON CONFLICT DO NOTHING on the
// [categorySlug, topicNormalized, language] unique constraint.
//
// Run: node scripts/seed-sciences-topics.mjs
import "dotenv/config";
import pg from "pg";
import crypto from "crypto";

const TOPICS = [
  { es: "El cuerpo humano", fr: "Le corps humain", en: "The human body", difficulty: "easy" },
  { es: "Los dinosaurios", fr: "Les dinosaures", en: "Dinosaurs", difficulty: "easy" },
  { es: "La química cotidiana", fr: "La chimie au quotidien", en: "Everyday chemistry", difficulty: "medium" },
  { es: "Inventos que cambiaron el mundo", fr: "Les inventions qui ont changé le monde", en: "Inventions that changed the world", difficulty: "medium" },
  { es: "El sistema solar", fr: "Le système solaire", en: "The solar system", difficulty: "easy" },
  { es: "Los océanos y la vida marina", fr: "Les océans et la vie marine", en: "Oceans and marine life", difficulty: "easy" },
  { es: "La física para todos", fr: "La physique pour tous", en: "Physics for everyone", difficulty: "medium" },
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
    categorySlug: "sciences",
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
  `SELECT language, count(*)::int AS n FROM "CategoryTopic" WHERE "categorySlug" = 'sciences' GROUP BY language ORDER BY language`
);
console.log("Post-seed counts for sciences:", counts.rows);

await client.end();
