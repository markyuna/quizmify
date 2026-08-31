// One-off CategoryTopic seed for "informatica": 7 topics x 3 languages
// (fr/es/en), 21 rows, native per-language (not fr-only + lazy-translate) --
// same policy as the arts/france/geographie seeds. Difficulty assigned per
// topic by relative complexity (broad/intro = easy, domain-specific =
// medium, conceptual = hard).
//
// Safe to re-run: ON CONFLICT DO NOTHING on the
// [categorySlug, topicNormalized, language] unique constraint.
//
// Run: node scripts/seed-informatica-topics.mjs
import "dotenv/config";
import pg from "pg";
import crypto from "crypto";

const TOPICS = [
  { es: "Programación", fr: "Programmation", en: "Programming", difficulty: "easy" },
  { es: "Bases de Datos", fr: "Bases de Données", en: "Databases", difficulty: "medium" },
  { es: "Redes de Computadoras", fr: "Réseaux Informatiques", en: "Computer Networks", difficulty: "medium" },
  { es: "Ciberseguridad", fr: "Cybersécurité", en: "Cybersecurity", difficulty: "medium" },
  { es: "Desarrollo Web", fr: "Développement Web", en: "Web Development", difficulty: "easy" },
  { es: "Estructuras de Datos", fr: "Structures de Données", en: "Data Structures", difficulty: "hard" },
  { es: "Inteligencia Artificial", fr: "Intelligence Artificielle", en: "Artificial Intelligence", difficulty: "medium" },
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
    categorySlug: "informatica",
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
  `SELECT language, count(*)::int AS n FROM "CategoryTopic" WHERE "categorySlug" = 'informatica' GROUP BY language ORDER BY language`
);
console.log("Post-seed counts for informatica:", counts.rows);

await client.end();
