// One-off CategoryTopic seed for "arts": 18 topics x 3 languages (fr/es/en),
// 54 rows, native per-language (not fr-only + lazy-translate) -- same policy
// as the france/geographie seeds. Difficulty assigned per topic by relative
// complexity (broad/pop-culture = easy, period/movement-specific = medium,
// niche/conceptual = hard) rather than the flat "medium" used in earlier
// batches (animaux/cinema/sports).
//
// Safe to re-run: ON CONFLICT DO NOTHING on the
// [categorySlug, topicNormalized, language] unique constraint.
//
// Run: node scripts/seed-arts-topics.mjs
import "dotenv/config";
import pg from "pg";
import crypto from "crypto";

const TOPICS = [
  { es: "Movimientos artísticos", fr: "Mouvements artistiques", en: "Art movements", difficulty: "medium" },
  { es: "Escultura a través de la historia", fr: "La sculpture à travers l'histoire", en: "Sculpture through history", difficulty: "medium" },
  { es: "Arquitectura famosa", fr: "Architecture célèbre", en: "Famous architecture", difficulty: "easy" },
  { es: "Impresionismo", fr: "Impressionnisme", en: "Impressionism", difficulty: "easy" },
  { es: "Arte del Renacimiento", fr: "Art de la Renaissance", en: "Renaissance art", difficulty: "medium" },
  { es: "Arte moderno y contemporáneo", fr: "Art moderne et contemporain", en: "Modern and contemporary art", difficulty: "hard" },
  { es: "Museos del mundo", fr: "Musées du monde", en: "Museums of the world", difficulty: "easy" },
  { es: "Obras de arte icónicas", fr: "Œuvres d'art emblématiques", en: "Iconic artworks", difficulty: "easy" },
  { es: "Street art y grafiti", fr: "Street art et graffiti", en: "Street art and graffiti", difficulty: "easy" },
  { es: "Diseño y artes decorativas", fr: "Design et arts décoratives", en: "Design and decorative arts", difficulty: "hard" },
  { es: "Grandes artistas de la historia", fr: "Grands artistes de l'histoire", en: "Great artists in history", difficulty: "medium" },
  { es: "Arte egipcio y antiguo", fr: "Art égyptien et antique", en: "Ancient and Egyptian art", difficulty: "medium" },
  { es: "Pintores españoles", fr: "Peintres espagnols", en: "Spanish painters", difficulty: "medium" },
  { es: "Pintores franceses", fr: "Peintres français", en: "French painters", difficulty: "medium" },
  { es: "Surrealismo", fr: "Surréalisme", en: "Surrealism", difficulty: "medium" },
  { es: "Cubismo", fr: "Cubisme", en: "Cubism", difficulty: "medium" },
  { es: "Arte barroco", fr: "Art baroque", en: "Baroque art", difficulty: "hard" },
  { es: "Diseño gráfico", fr: "Design graphique", en: "Graphic design", difficulty: "medium" },
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
    categorySlug: "arts",
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
  `SELECT language, count(*)::int AS n FROM "CategoryTopic" WHERE "categorySlug" = 'arts' GROUP BY language ORDER BY language`
);
console.log("Post-seed counts for arts:", counts.rows);

await client.end();
