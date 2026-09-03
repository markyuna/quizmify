// One-shot backfill of CategoryTopic.topicKey (column added by
// `feat(db): add CategoryTopic.topicKey ...`, applied via `prisma db push`).
//
// Groups the rows that represent the same concept across languages, so the
// Phase C submit guard can dedupe on (topicKey, language) instead of silently
// discarding a replayed translated card. topicKey GROUPS, it does not
// deduplicate -- no row is deleted or merged here.
//
// Segments (see the Phase A dimensioning analysis, 593 rows total):
//   1a  committed seed scripts       -> exact (categorySlug, language, normalizeTopic) match
//   1b  9 uncommitted trilingual seed batches -> id-chunk within the createdAt batch
//   2   geographie "Capitales du monde"/"Capitales del mundo" -> one shared key
//   3   everything else              -> topicKey = own id (group of 1)
//
// The concept arrays for segment 1a are parsed straight out of the five
// committed seed scripts, so this stays in sync with them by construction
// rather than re-hardcoding 96 concepts.
//
// Transactional: computation happens with zero writes; the only writes are one
// UPDATE per row, then the coverage + consistency checks run, then COMMIT. Any
// assertion failure ROLLBACKs -- nothing is written.
//
// One-shot guard: refuses to run if any row already has a topicKey (a previous
// successful run). Set FORCE_REBACKFILL=1 to override (will regenerate every
// key -- grouping stays identical, key strings change).
//
// Run: node scripts/backfill-category-topic-keys.mjs
import "dotenv/config";
import pg from "pg";
import crypto from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Same trim/collapse-whitespace rule as src/lib/topicUtils.ts's normalizeTopic.
function normalizeTopic(topic) {
  return topic.trim().replace(/\s+/g, " ");
}

// ---- parse the { es, fr, en } concept arrays from the committed seed scripts ----
function readSeedArray(file, name) {
  const src = readFileSync(join(__dirname, file), "utf8");
  const m = src.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`));
  if (!m) throw new Error(`${name} array not found in ${file}`);
  return new Function(`return (${m[1]});`)();
}
function readSeedObject(file, name) {
  const src = readFileSync(join(__dirname, file), "utf8");
  const m = src.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`));
  if (!m) throw new Error(`${name} object not found in ${file}`);
  return new Function(`return (${m[1]});`)();
}

// segment 1a: [{ slug, concept:{fr,es,en} }]
const scriptConcepts = [];
for (const [file, slug] of [
  ["seed-arts-topics.mjs", "arts"],
  ["seed-sciences-topics.mjs", "sciences"],
  ["seed-sports-football-topics.mjs", "sports"],
  ["seed-informatica-topics.mjs", "informatica"],
]) {
  for (const c of readSeedArray(file, "TOPICS")) scriptConcepts.push({ slug, c });
}
for (const [slug, arr] of Object.entries(
  readSeedObject("seed-fr-only-catalog-translations.mjs", "SEEDS")
)) {
  for (const c of arr) scriptConcepts.push({ slug, c });
}

// segment 1b: the 9 uncommitted trilingual seed batches, identified by
// (categorySlug, exact batch row count). Verified in Phase A: within each,
// rows sorted by id chunk cleanly into fr/es/en triples.
const SEG1B_BATCHES = [
  { slug: "france", size: 33 },
  { slug: "disney", size: 30 },
  { slug: "harry-potter", size: 30 },
  { slug: "nature", size: 27 },
  { slug: "langue-francaise", size: 30 },
  { slug: "alimentation", size: 30 },
  { slug: "code-de-la-route", size: 27 },
  { slug: "drapeaux", size: 30 },
  { slug: "geographie", size: 51 },
];

// segment 2: the one known cross-language conceptual duplicate.
const SEG2_PAIR = [
  { slug: "geographie", language: "fr", topicNormalized: "Capitales du monde" },
  { slug: "geographie", language: "es", topicNormalized: "Capitales del mundo" },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

// rowId -> topicKey; each row assigned at most once.
const assign = new Map();
function put(id, key, ctx) {
  if (assign.has(id)) {
    throw new Error(`row ${id} assigned twice (${ctx}); already had ${assign.get(id)}`);
  }
  assign.set(id, key);
}

try {
  // ---- one-shot guard ----
  const pre = (
    await client.query(`SELECT COUNT(*)::int AS n FROM "CategoryTopic" WHERE "topicKey" IS NOT NULL`)
  ).rows[0].n;
  if (pre > 0 && !process.env.FORCE_REBACKFILL) {
    throw new Error(
      `${pre} rows already have a topicKey -- this is a one-shot backfill. ` +
      `Set FORCE_REBACKFILL=1 to regenerate every key.`
    );
  }

  await client.query("BEGIN");

  const { rows } = await client.query(
    `SELECT id, "categorySlug", language, "topicDisplay", "topicNormalized", "createdAt"
     FROM "CategoryTopic"`
  );
  const total = rows.length;
  const byKey = new Map(rows.map((r) => [`${r.categorySlug}|${r.language}|${r.topicNormalized}`, r]));

  // ---------- SEGMENT 1a ----------
  let s1aGroups = 0;
  const s1aPartial = [];
  for (const { slug, c } of scriptConcepts) {
    const key = crypto.randomUUID();
    const hits = [];
    for (const lang of ["fr", "es", "en"]) {
      const r = byKey.get(`${slug}|${lang}|${normalizeTopic(c[lang])}`);
      if (r) hits.push(r);
    }
    if (hits.length === 0) continue;
    if (hits.length < 3) s1aPartial.push({ slug, fr: c.fr, matched: hits.map((r) => r.language) });
    for (const r of hits) put(r.id, key, `1a ${slug}/${c.fr}`);
    s1aGroups++;
  }
  const s1aRows = [...assign.keys()].length;

  // ---------- SEGMENT 1b (hard runtime assertion) ----------
  let s1bGroups = 0;
  const s1bBefore = assign.size;
  for (const { slug, size } of SEG1B_BATCHES) {
    if (size % 3 !== 0) throw new Error(`SEG1B config error: ${slug} size ${size} not divisible by 3`);
    const batches = (
      await client.query(
        `SELECT "createdAt" FROM "CategoryTopic"
         WHERE "categorySlug" = $1 GROUP BY "createdAt" HAVING COUNT(*) = $2`,
        [slug, size]
      )
    ).rows;
    if (batches.length !== 1) {
      throw new Error(
        `SEG1B abort: ${slug} -- expected exactly one createdAt batch of ${size} rows, found ${batches.length}`
      );
    }
    const batchRows = (
      await client.query(
        `SELECT id, language, "topicDisplay" FROM "CategoryTopic"
         WHERE "categorySlug" = $1 AND "createdAt" = $2 ORDER BY id ASC`,
        [slug, batches[0].createdAt]
      )
    ).rows;
    if (batchRows.length !== size) {
      throw new Error(`SEG1B abort: ${slug} -- batch fetched ${batchRows.length} rows, expected ${size}`);
    }
    for (let i = 0; i < batchRows.length; i += 3) {
      const chunk = batchRows.slice(i, i + 3);
      const langs = chunk.map((r) => r.language).sort().join(",");
      if (langs !== "en,es,fr") {
        throw new Error(
          `SEG1B abort: ${slug} chunk at offset ${i} has languages [${chunk.map((r) => r.language)}], ` +
          `not fr/es/en. Rows: ${chunk.map((r) => `${r.id} ${JSON.stringify(r.topicDisplay)}`).join(" | ")}`
        );
      }
      const key = crypto.randomUUID();
      for (const r of chunk) put(r.id, key, `1b ${slug} chunk ${i / 3}`);
      s1bGroups++;
    }
  }
  const s1bRows = assign.size - s1bBefore;

  // ---------- SEGMENT 2 ----------
  const seg2Key = crypto.randomUUID();
  for (const spec of SEG2_PAIR) {
    const r = byKey.get(`${spec.slug}|${spec.language}|${spec.topicNormalized}`);
    if (!r) throw new Error(`SEG2 abort: row not found for ${JSON.stringify(spec)}`);
    put(r.id, seg2Key, "seg2 geographie capitales");
  }
  const seg2Rows = SEG2_PAIR.length;

  // ---------- SEGMENT 3: remaining rows -> topicKey = own id ----------
  let seg3Rows = 0;
  for (const r of rows) {
    if (!assign.has(r.id)) {
      assign.set(r.id, r.id);
      seg3Rows++;
    }
  }

  if (assign.size !== total) {
    throw new Error(`coverage abort: assigned ${assign.size} of ${total} rows`);
  }

  // ---------- APPLY ----------
  for (const [id, key] of assign) {
    await client.query(`UPDATE "CategoryTopic" SET "topicKey" = $1 WHERE id = $2`, [key, id]);
  }

  // ---------- VERIFY (inside tx, before COMMIT) ----------
  const nullLeft = (
    await client.query(`SELECT COUNT(*)::int AS n FROM "CategoryTopic" WHERE "topicKey" IS NULL`)
  ).rows[0].n;
  if (nullLeft !== 0) throw new Error(`verify abort: ${nullLeft} rows still have NULL topicKey`);

  const crossCat = (
    await client.query(`
      SELECT "topicKey", array_agg(DISTINCT "categorySlug") AS slugs
      FROM "CategoryTopic" GROUP BY "topicKey" HAVING COUNT(DISTINCT "categorySlug") > 1
    `)
  ).rows;
  if (crossCat.length > 0) {
    console.error("CONSISTENCY FAILURE -- topicKey spanning multiple categories:");
    for (const r of crossCat) console.error(`  ${r.topicKey}: ${r.slugs}`);
    throw new Error("consistency abort: a topicKey crosses categorySlug -- rolled back, ask before proceeding");
  }

  await client.query("COMMIT");

  console.log("COMMITTED.");
  console.log(`  seg 1a: ${s1aRows} rows / ${s1aGroups} groups`);
  if (s1aPartial.length) {
    console.log("  seg 1a PARTIAL concepts (matched <3 rows -- review):");
    for (const p of s1aPartial) console.log(`     ${p.slug} / ${JSON.stringify(p.fr)} -> ${p.matched}`);
  }
  console.log(`  seg 1b: ${s1bRows} rows / ${s1bGroups} groups`);
  console.log(`  seg 2 : ${seg2Rows} rows / 1 group`);
  console.log(`  seg 3 : ${seg3Rows} rows / ${seg3Rows} groups`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("ROLLED BACK:", err.message);
  await client.end();
  process.exit(1);
}

// ---------- final report ----------
const distinct = (
  await client.query(`SELECT COUNT(DISTINCT "topicKey")::int AS n FROM "CategoryTopic"`)
).rows[0].n;
const dist = (
  await client.query(`
    SELECT size, COUNT(*)::int AS groups FROM (
      SELECT "topicKey", COUNT(*)::int AS size FROM "CategoryTopic" GROUP BY "topicKey"
    ) t GROUP BY size ORDER BY size
  `)
).rows;
console.log(`\nDistinct topicKey: ${distinct}`);
console.log("Group-size distribution:");
for (const r of dist) console.log(`  size ${r.size}: ${r.groups} groups`);

await client.end();
