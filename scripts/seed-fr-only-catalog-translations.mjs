// One-off CategoryTopic seed: native es/en rows for the 5 categories that were
// originally seeded French-only (or nearly so), so es/en visitors stop getting
// those cards through the render-time gpt-4.1-mini label translation in
// src/lib/categoryTopics.ts (resolveDisplayLabel). This is step 2 of the
// catalog fix -- step 1 was commit 51c1d6b, which aligned the /categories card
// counter with the list actually rendered on the category page.
//
// The es/en topicDisplay values here are NOT new translations: they are taken
// verbatim from each fr row's translatedLabels cache -- i.e. the exact label
// es/en users have already been seeing. No new topics are invented; every row
// is the es/en counterpart of an existing fr CategoryTopic row, and difficulty
// mirrors that fr row.
//
// The fr entries are kept in the array for readability and are re-inserted as
// no-ops: they all already exist, and ON CONFLICT DO NOTHING leaves them (and
// their createdByGameId) untouched.
//
// Deliberately NOT covered:
//   - The 3 football topics in "sports" -- already trilingual-native via
//     scripts/seed-sports-football-topics.mjs. Re-seeding them from the fr
//     translatedLabels cache ("El fútbol") would NOT match the existing native
//     es row ("Fútbol") and would mint a duplicate, so they are excluded.
//   - The es-only organic topics "Economía" (culture-generale) and "Historia"
//     (histoire): they have no fr counterpart, so nothing is added for them
//     and they stay as single-language rows.
//
// One existing es row is absorbed rather than duplicated:
//   animaux / "Animales domésticos" (language es, createdByGameId set -- a real
//   play). Its (categorySlug, topicNormalized, language) key matches this
//   seed's row exactly (verified), so ON CONFLICT DO NOTHING skips the insert
//   and the organic row is left exactly as-is.
//
// Safe to re-run: ON CONFLICT DO NOTHING on the
// [categorySlug, topicNormalized, language] unique constraint.
//
// Run: node scripts/seed-fr-only-catalog-translations.mjs
import "dotenv/config";
import pg from "pg";
import crypto from "crypto";

// { es, fr, en, difficulty } per topic, keyed by categorySlug.
// fr = text of the existing row; es/en = that row's translatedLabels verbatim.
const SEEDS = {
  animaux: [
    { fr: "Animaux de la ferme", es: "Animales de la granja", en: "Farm animals", difficulty: "medium" },
    { fr: "Animaux sauvages d'Afrique", es: "Animales salvajes de África", en: "Wild animals of Africa", difficulty: "medium" },
    { fr: "Faune de France", es: "Fauna de Francia", en: "Fauna of France", difficulty: "medium" },
    { fr: "Animaux marins", es: "Animales marinos", en: "Marine animals", difficulty: "medium" },
    { fr: "Oiseaux du monde", es: "Aves del mundo", en: "Birds of the world", difficulty: "medium" },
    { fr: "Animaux domestiques", es: "Animales domésticos", en: "Pets", difficulty: "medium" },
    { fr: "Insectes et petites bêtes", es: "Insectos y pequeños animales", en: "Insects and small creatures", difficulty: "medium" },
    { fr: "Animaux de la jungle et forêt tropicale", es: "Animales de la jungla y la selva tropical", en: "Animals of the jungle and tropical forest", difficulty: "medium" },
    { fr: "Animaux polaires", es: "Animales polares", en: "Polar animals", difficulty: "medium" },
    { fr: "Reptiles et amphibiens", es: "Reptiles y anfibios", en: "Reptiles and amphibians", difficulty: "medium" },
    { fr: "Dinosaures et animaux préhistoriques", es: "Dinosaurios y animales prehistóricos", en: "Dinosaurs and prehistoric animals", difficulty: "medium" },
    { fr: "Animaux en voie de disparition", es: "Animales en peligro de extinción", en: "Endangered animals", difficulty: "medium" },
  ],
  cinema: [
    { fr: "Cinéma français des Années 90", es: "Cine francés de los años 90", en: "French Cinema of the 90s", difficulty: "easy" },
    { fr: "Cinéma français classique", es: "Cine francés clásico", en: "Classic French Cinema", difficulty: "medium" },
    { fr: "Comédies françaises cultes", es: "Comedias francesas de culto", en: "Cult French comedies", difficulty: "medium" },
    { fr: "Acteurs et actrices français", es: "Actores y actrices franceses", en: "French actors and actresses", difficulty: "medium" },
    { fr: "Films français primés", es: "Películas francesas premiadas", en: "Award-winning French films", difficulty: "medium" },
    { fr: "Dessins animés et films d'animation français", es: "Dibujos animados y películas de animación francesas", en: "French cartoons and animated films", difficulty: "medium" },
    { fr: "Cinéma policier et thriller français", es: "Cine policíaco y thriller francés", en: "French crime cinema and thriller", difficulty: "medium" },
    { fr: "Blockbusters hollywoodiens", es: "Éxitos de taquilla de Hollywood", en: "Hollywood blockbusters", difficulty: "medium" },
    { fr: "Super-héros au cinéma", es: "Superhéroes en el cine", en: "Superheroes in cinema", difficulty: "medium" },
    { fr: "Films d'animation internationaux", es: "Películas de animación internacionales", en: "International animated films", difficulty: "medium" },
    { fr: "Grands réalisateurs du monde", es: "Grandes directores del mundo", en: "Great filmmakers of the world", difficulty: "medium" },
    { fr: "Sagas et franchises cultes", es: "Sagas y franquicias de culto", en: "Cult Sagas and Franchises", difficulty: "medium" },
    { fr: "Cinéma d'horreur et fantastique", es: "Cine de terror y fantástico", en: "Horror and Fantasy Cinema", difficulty: "medium" },
  ],
  "culture-generale": [
    { fr: "Histoire de France", es: "Historia de Francia", en: "History of France", difficulty: "medium" },
    { fr: "Géographie mondiale", es: "Geografía mundial", en: "World Geography", difficulty: "medium" },
    { fr: "Mythologie grecque et romaine", es: "Mitología griega y romana", en: "Greek and Roman Mythology", difficulty: "medium" },
    { fr: "Littérature française", es: "Literatura francesa", en: "French literature", difficulty: "medium" },
    { fr: "Art et peinture", es: "Arte y pintura", en: "Art and painting", difficulty: "medium" },
    { fr: "Sciences et découvertes", es: "Ciencias y descubrimientos", en: "Science and Discoveries", difficulty: "medium" },
    { fr: "Cinéma français", es: "Cine francés", en: "French cinema", difficulty: "medium" },
    { fr: "Gastronomie française", es: "Gastronomía francesa", en: "French gastronomy", difficulty: "medium" },
    { fr: "Monuments du monde", es: "Monumentos del mundo", en: "World Monuments", difficulty: "medium" },
    { fr: "Grandes inventions", es: "Grandes inventos", en: "Great inventions", difficulty: "medium" },
    { fr: "Personnages historiques", es: "Personajes históricos", en: "Historical figures", difficulty: "medium" },
    { fr: "Traditions et fêtes du monde", es: "Tradiciones y fiestas del mundo", en: "Traditions and Festivals of the World", difficulty: "medium" },
  ],
  histoire: [
    { fr: "Histoire de France", es: "Historia de Francia", en: "History of France", difficulty: "medium" },
    { fr: "Révolution française", es: "Revolución francesa", en: "French Revolution", difficulty: "medium" },
    { fr: "Napoléon et l'Empire", es: "Napoleón y el Imperio", en: "Napoleon and the Empire", difficulty: "medium" },
    { fr: "La France sous l'Occupation et la Résistance", es: "Francia bajo la Ocupación y la Resistencia", en: "France under Occupation and the Resistance", difficulty: "medium" },
    { fr: "Rois et reines de France", es: "Reyes y reinas de Francia", en: "Kings and Queens of France", difficulty: "medium" },
    { fr: "Colonisation française", es: "Colonización francesa", en: "French colonization", difficulty: "medium" },
    { fr: "Antiquité égyptienne et grecque", es: "Antigüedad egipcia y griega", en: "Egyptian and Greek Antiquity", difficulty: "medium" },
    { fr: "Empire romain", es: "Imperio romano", en: "Roman Empire", difficulty: "medium" },
    { fr: "Seconde Guerre mondiale", es: "Segunda Guerra Mundial", en: "World War II", difficulty: "medium" },
    { fr: "Guerre froide", es: "Guerra Fría", en: "Cold War", difficulty: "medium" },
    { fr: "Grandes civilisations précolombiennes", es: "Grandes civilizaciones precolombinas", en: "Great Pre-Columbian Civilizations", difficulty: "medium" },
    { fr: "Révolutions industrielles dans le monde", es: "Revoluciones industriales en el mundo", en: "Industrial revolutions in the world", difficulty: "medium" },
  ],
  sports: [
    { fr: "Jeux Olympiques de Paris 2024", es: "Juegos Olímpicos de París 2024", en: "Paris 2024 Olympic Games", difficulty: "medium" },
    { fr: "Tour de France (cyclisme)", es: "Tour de Francia (ciclismo)", en: "Tour de France (cycling)", difficulty: "medium" },
    { fr: "Rugby français", es: "Rugby francés", en: "French rugby", difficulty: "medium" },
    { fr: "Tennis français et Roland-Garros", es: "Tenis francés y Roland-Garros", en: "French tennis and Roland-Garros", difficulty: "medium" },
    { fr: "Champions olympiques français", es: "Campeones olímpicos franceses", en: "French Olympic champions", difficulty: "medium" },
    { fr: "Sports d'hiver en France", es: "Deportes de invierno en Francia", en: "Winter sports in France", difficulty: "medium" },
    { fr: "Jeux Olympiques à travers l'histoire", es: "Juegos Olímpicos a través de la historia", en: "Olympic Games through history", difficulty: "medium" },
    { fr: "Basketball et NBA", es: "Baloncesto y NBA", en: "Basketball and NBA", difficulty: "medium" },
    { fr: "Tennis international et Grand Chelem", es: "Tenis internacional y Grand Slam", en: "International Tennis and Grand Slam", difficulty: "medium" },
    { fr: "Athlétisme mondial", es: "Atletismo mundial", en: "World Athletics", difficulty: "medium" },
    { fr: "Sports extrêmes et de glisse", es: "Deportes extremos y de deslizamiento", en: "Extreme and board sports", difficulty: "medium" },
    { fr: "Grandes légendes du sport mondial", es: "Grandes leyendas del deporte mundial", en: "Great legends of world sport", difficulty: "medium" },
  ],
};

// Same trim/collapse-whitespace rule as src/lib/topicUtils.ts's normalizeTopic.
function normalizeTopic(topic) {
  return topic.trim().replace(/\s+/g, " ");
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const rows = Object.entries(SEEDS).flatMap(([categorySlug, topics]) =>
  topics.flatMap((topic) =>
    ["fr", "es", "en"].map((language) => ({
      id: crypto.randomUUID(),
      categorySlug,
      topicDisplay: topic[language],
      topicNormalized: normalizeTopic(topic[language]),
      language,
      difficulty: topic.difficulty,
    }))
  )
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
  `SELECT "categorySlug", language, count(*)::int AS n
   FROM "CategoryTopic"
   WHERE "categorySlug" = ANY($1)
   GROUP BY "categorySlug", language
   ORDER BY "categorySlug", language`,
  [Object.keys(SEEDS)]
);
console.log("Post-seed counts:", counts.rows);

await client.end();
