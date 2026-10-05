// One-off CategoryTopic seed for "beaute": 18 topics x 3 languages (fr/es/en),
// 54 rows, native per-language -- same shape and difficulty policy as
// seed-arts-topics.mjs (broad/everyday = easy, history/culture = medium,
// technical/niche = hard), plus a shared topicKey per concept (the column
// postdates the older seeds).
//
// Safe to re-run: ON CONFLICT DO NOTHING on the
// [categorySlug, topicNormalized, language] unique constraint (a re-run
// generates fresh topicKeys, but only for rows it actually inserts).
//
// Run: node scripts/seed-beaute-topics.mjs
import "dotenv/config";
import pg from "pg";
import crypto from "crypto";

const TOPICS = [
  { es: "Maquillaje: lo básico", fr: "Maquillage : les bases", en: "Makeup basics", difficulty: "easy" },
  { es: "Brochas y herramientas de maquillaje", fr: "Pinceaux et outils de maquillage", en: "Makeup brushes and tools", difficulty: "easy" },
  { es: "El pintalabios", fr: "Le rouge à lèvres", en: "Lipstick", difficulty: "easy" },
  { es: "Cuidado de la piel", fr: "Soins de la peau", en: "Skincare", difficulty: "easy" },
  { es: "Cuidado del cabello", fr: "Soins des cheveux", en: "Haircare", difficulty: "easy" },
  { es: "Peinados icónicos", fr: "Coiffures iconiques", en: "Iconic hairstyles", difficulty: "easy" },
  { es: "Manicura y nail art", fr: "Manucure et nail art", en: "Manicure and nail art", difficulty: "easy" },
  { es: "Marcas de cosmética", fr: "Marques de cosmétiques", en: "Cosmetics brands", difficulty: "easy" },
  { es: "Belleza y redes sociales", fr: "Beauté et réseaux sociaux", en: "Beauty and social media", difficulty: "easy" },
  { es: "Perfumes célebres", fr: "Parfums célèbres", en: "Famous fragrances", difficulty: "medium" },
  { es: "Historia del maquillaje", fr: "Histoire du maquillage", en: "History of makeup", difficulty: "medium" },
  { es: "Tendencias de belleza por décadas", fr: "Tendances beauté à travers les décennies", en: "Beauty trends through the decades", difficulty: "medium" },
  { es: "Iconos de belleza", fr: "Icônes de beauté", en: "Beauty icons", difficulty: "medium" },
  { es: "Rituales de belleza del mundo", fr: "Rituels de beauté du monde", en: "Beauty rituals around the world", difficulty: "medium" },
  { es: "Protección solar", fr: "Protection solaire", en: "Sun protection", difficulty: "medium" },
  { es: "Ingredientes cosméticos", fr: "Ingrédients cosmétiques", en: "Cosmetic ingredients", difficulty: "hard" },
  { es: "Perfumería: notas y familias olfativas", fr: "Parfumerie : notes et familles olfactives", en: "Perfumery: notes and scent families", difficulty: "hard" },
  { es: "Maquillaje de cine y efectos especiales", fr: "Maquillage de cinéma et effets spéciaux", en: "Film and special effects makeup", difficulty: "hard" },
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

const rows = TOPICS.flatMap((topic) => {
  // One shared topicKey per concept, linking its fr/es/en rows -- same
  // grouping /api/quiz/submit and backfill-category-topic-keys.mjs rely on.
  const topicKey = crypto.randomUUID();
  return ["fr", "es", "en"].map((language) => ({
    id: crypto.randomUUID(),
    topicKey,
    categorySlug: "beaute",
    topicDisplay: topic[language],
    topicNormalized: normalizeTopic(topic[language]),
    language,
    difficulty: topic.difficulty,
  }));
});

const client = new pg.Client({ connectionString });
await client.connect();

let inserted = 0;
try {
  await client.query("BEGIN");

  for (const row of rows) {
    const result = await client.query(
      `INSERT INTO "CategoryTopic" (id, "categorySlug", "topicDisplay", "topicNormalized", language, difficulty, "createdAt", hidden, "createdByGameId", "topicKey")
       VALUES ($1, $2, $3, $4, $5, $6, now(), false, NULL, $7)
       ON CONFLICT ("categorySlug", "topicNormalized", language) DO NOTHING`,
      [row.id, row.categorySlug, row.topicDisplay, row.topicNormalized, row.language, row.difficulty, row.topicKey]
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
  `SELECT language, count(*)::int AS n FROM "CategoryTopic" WHERE "categorySlug" = 'beaute' GROUP BY language ORDER BY language`
);
console.log("Post-seed counts for beaute:", counts.rows);

await client.end();
