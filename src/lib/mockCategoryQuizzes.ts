// Mock content for the category directory pages -- no DB, no AI, just
// hand-written placeholder items so the /quiz/categoria/[slug] layout can be
// validated before real quiz generation is wired in. Thumbnails follow the
// same "assume the asset exists" convention as Category.heroImage in
// categories.ts, under /public/images/categories/{slug}/item-{n}.webp --
// deliberately not pointing at external Unsplash URLs, since a few of the
// ones already hardcoded in topicImages.ts 404 in practice.

export type QuizDifficulty = "Facile" | "Moyen" | "Difficile";

type BaseItem = {
  id: string;
  title: string;
  thumbnail: string;
  tags: string[];
  publishedAt: string;
  trending: boolean;
};

export type MockQuizItem = BaseItem & { kind: "quiz"; difficulty: QuizDifficulty };
export type MockPersonalityTestItem = BaseItem & { kind: "personality-test" };
export type MockCategoryItem = MockQuizItem | MockPersonalityTestItem;

function thumb(slug: string, n: number): string {
  return `/images/categories/${slug}/item-${n}.webp`;
}

export const MOCK_CATEGORY_ITEMS: Record<string, MockCategoryItem[]> = {
  "culture-generale": [
    { id: "culture-generale-1", kind: "quiz", title: "Culture générale : le grand quiz", thumbnail: thumb("culture-generale", 1), difficulty: "Moyen", tags: ["culture générale", "mélange"], publishedAt: "2026-07-20", trending: true },
    { id: "culture-generale-2", kind: "quiz", title: "100 questions pour tout savoir", thumbnail: thumb("culture-generale", 2), difficulty: "Difficile", tags: ["culture générale", "expert"], publishedAt: "2026-06-15", trending: false },
    { id: "culture-generale-3", kind: "quiz", title: "Quiz express : 10 questions faciles", thumbnail: thumb("culture-generale", 3), difficulty: "Facile", tags: ["culture générale", "débutant"], publishedAt: "2026-08-01", trending: false },
    { id: "culture-generale-4", kind: "quiz", title: "Spécial soirée quiz entre amis", thumbnail: thumb("culture-generale", 4), difficulty: "Moyen", tags: ["culture générale", "soirée"], publishedAt: "2026-07-05", trending: false },
    { id: "culture-generale-5", kind: "quiz", title: "Le quiz ultime avant un jeu télévisé", thumbnail: thumb("culture-generale", 5), difficulty: "Difficile", tags: ["culture générale", "préparation"], publishedAt: "2026-08-10", trending: true },
  ],
  histoire: [
    { id: "histoire-1", kind: "quiz", title: "Les grandes dates de l'Histoire de France", thumbnail: thumb("histoire", 1), difficulty: "Moyen", tags: ["histoire", "france"], publishedAt: "2026-07-22", trending: true },
    { id: "histoire-2", kind: "quiz", title: "Antiquité : Rome et la Grèce", thumbnail: thumb("histoire", 2), difficulty: "Moyen", tags: ["antiquité", "rome", "grèce"], publishedAt: "2026-06-30", trending: false },
    { id: "histoire-3", kind: "quiz", title: "La Seconde Guerre mondiale", thumbnail: thumb("histoire", 3), difficulty: "Difficile", tags: ["guerre", "XXe siècle"], publishedAt: "2026-08-05", trending: true },
    { id: "histoire-4", kind: "quiz", title: "Rois et reines de France", thumbnail: thumb("histoire", 4), difficulty: "Facile", tags: ["monarchie", "france"], publishedAt: "2026-07-10", trending: false },
    { id: "histoire-5", kind: "quiz", title: "Les révolutions qui ont changé le monde", thumbnail: thumb("histoire", 5), difficulty: "Difficile", tags: ["révolution", "politique"], publishedAt: "2026-06-18", trending: false },
  ],
  geographie: [
    { id: "geographie-1", kind: "quiz", title: "Quiz Villes du Monde", thumbnail: thumb("geographie", 1), difficulty: "Facile", tags: ["villes", "monde"], publishedAt: "2026-08-08", trending: true },
    { id: "geographie-2", kind: "quiz", title: "Fleuves et montagnes", thumbnail: thumb("geographie", 2), difficulty: "Moyen", tags: ["relief", "hydrographie"], publishedAt: "2026-07-14", trending: false },
    { id: "geographie-3", kind: "quiz", title: "L'Europe et ses frontières", thumbnail: thumb("geographie", 3), difficulty: "Moyen", tags: ["europe", "frontières"], publishedAt: "2026-07-28", trending: false },
    { id: "geographie-4", kind: "quiz", title: "Géographie de la France", thumbnail: thumb("geographie", 4), difficulty: "Facile", tags: ["france", "régions"], publishedAt: "2026-08-12", trending: true },
    { id: "geographie-5", kind: "quiz", title: "Quiz expert : géopolitique mondiale", thumbnail: thumb("geographie", 5), difficulty: "Difficile", tags: ["géopolitique", "expert"], publishedAt: "2026-06-25", trending: false },
  ],
  sciences: [
    { id: "sciences-1", kind: "quiz", title: "Physique : les bases", thumbnail: thumb("sciences", 1), difficulty: "Facile", tags: ["physique", "débutant"], publishedAt: "2026-07-02", trending: false },
    { id: "sciences-2", kind: "quiz", title: "Le corps humain", thumbnail: thumb("sciences", 2), difficulty: "Moyen", tags: ["biologie", "corps humain"], publishedAt: "2026-08-03", trending: true },
    { id: "sciences-3", kind: "quiz", title: "L'espace et l'astronomie", thumbnail: thumb("sciences", 3), difficulty: "Moyen", tags: ["astronomie", "espace"], publishedAt: "2026-08-09", trending: true },
    { id: "sciences-4", kind: "quiz", title: "Chimie : tableau périodique", thumbnail: thumb("sciences", 4), difficulty: "Difficile", tags: ["chimie", "éléments"], publishedAt: "2026-06-20", trending: false },
    { id: "sciences-5", kind: "quiz", title: "Grandes découvertes scientifiques", thumbnail: thumb("sciences", 5), difficulty: "Moyen", tags: ["histoire des sciences"], publishedAt: "2026-07-16", trending: false },
  ],
  arts: [
    { id: "arts-1", kind: "quiz", title: "Peintres célèbres", thumbnail: thumb("arts", 1), difficulty: "Moyen", tags: ["peinture", "artistes"], publishedAt: "2026-08-06", trending: true },
    { id: "arts-2", kind: "quiz", title: "Courants artistiques", thumbnail: thumb("arts", 2), difficulty: "Difficile", tags: ["histoire de l'art"], publishedAt: "2026-06-28", trending: false },
    { id: "arts-3", kind: "quiz", title: "Musées et œuvres cultes", thumbnail: thumb("arts", 3), difficulty: "Moyen", tags: ["musées", "œuvres"], publishedAt: "2026-07-19", trending: false },
    { id: "arts-4", kind: "quiz", title: "Sculpture à travers les âges", thumbnail: thumb("arts", 4), difficulty: "Difficile", tags: ["sculpture"], publishedAt: "2026-06-12", trending: false },
    { id: "arts-5", kind: "quiz", title: "Quiz facile : l'art pour tous", thumbnail: thumb("arts", 5), difficulty: "Facile", tags: ["art", "débutant"], publishedAt: "2026-08-11", trending: true },
  ],
  france: [
    { id: "france-1", kind: "quiz", title: "Les régions françaises", thumbnail: thumb("france", 1), difficulty: "Facile", tags: ["régions", "géographie"], publishedAt: "2026-08-04", trending: true },
    { id: "france-2", kind: "quiz", title: "Monuments emblématiques", thumbnail: thumb("france", 2), difficulty: "Moyen", tags: ["monuments", "patrimoine"], publishedAt: "2026-07-08", trending: false },
    { id: "france-3", kind: "quiz", title: "Traditions et fêtes françaises", thumbnail: thumb("france", 3), difficulty: "Moyen", tags: ["traditions", "culture"], publishedAt: "2026-07-25", trending: false },
    { id: "france-4", kind: "quiz", title: "Spécialités régionales", thumbnail: thumb("france", 4), difficulty: "Facile", tags: ["gastronomie", "régions"], publishedAt: "2026-08-13", trending: true },
    { id: "france-5", kind: "quiz", title: "Quiz expert : symboles de la République", thumbnail: thumb("france", 5), difficulty: "Difficile", tags: ["symboles", "république"], publishedAt: "2026-06-22", trending: false },
  ],
  cinema: [
    { id: "cinema-1", kind: "quiz", title: "Films cultes des années 90", thumbnail: thumb("cinema", 1), difficulty: "Moyen", tags: ["films", "années 90"], publishedAt: "2026-08-07", trending: true },
    { id: "cinema-2", kind: "quiz", title: "Répliques mythiques du cinéma", thumbnail: thumb("cinema", 2), difficulty: "Facile", tags: ["répliques", "culture pop"], publishedAt: "2026-08-14", trending: true },
    { id: "cinema-3", kind: "quiz", title: "Réalisateurs légendaires", thumbnail: thumb("cinema", 3), difficulty: "Difficile", tags: ["réalisateurs"], publishedAt: "2026-06-27", trending: false },
    { id: "cinema-4", kind: "quiz", title: "Oscars et récompenses", thumbnail: thumb("cinema", 4), difficulty: "Moyen", tags: ["oscars", "récompenses"], publishedAt: "2026-07-11", trending: false },
    { id: "cinema-5", kind: "quiz", title: "Cinéma français", thumbnail: thumb("cinema", 5), difficulty: "Moyen", tags: ["cinéma français"], publishedAt: "2026-07-30", trending: false },
  ],
  disney: [
    { id: "disney-1", kind: "quiz", title: "Les classiques Disney", thumbnail: thumb("disney", 1), difficulty: "Facile", tags: ["classiques", "animation"], publishedAt: "2026-08-02", trending: true },
    { id: "disney-2", kind: "quiz", title: "Chansons Disney inoubliables", thumbnail: thumb("disney", 2), difficulty: "Moyen", tags: ["chansons", "musique"], publishedAt: "2026-08-10", trending: true },
    { id: "disney-3", kind: "quiz", title: "Princesses et héros Disney", thumbnail: thumb("disney", 3), difficulty: "Facile", tags: ["personnages"], publishedAt: "2026-07-17", trending: false },
    { id: "disney-4", kind: "quiz", title: "Pixar : le grand quiz", thumbnail: thumb("disney", 4), difficulty: "Moyen", tags: ["pixar", "animation"], publishedAt: "2026-07-06", trending: false },
    { id: "disney-5", kind: "quiz", title: "Parcs Disney à travers le monde", thumbnail: thumb("disney", 5), difficulty: "Difficile", tags: ["parcs", "voyage"], publishedAt: "2026-06-19", trending: false },
  ],
  "harry-potter": [
    { id: "harry-potter-1", kind: "quiz", title: "Les maisons de Poudlard", thumbnail: thumb("harry-potter", 1), difficulty: "Facile", tags: ["poudlard", "maisons"], publishedAt: "2026-08-09", trending: true },
    { id: "harry-potter-2", kind: "quiz", title: "Sortilèges et formules magiques", thumbnail: thumb("harry-potter", 2), difficulty: "Moyen", tags: ["sortilèges", "magie"], publishedAt: "2026-08-01", trending: true },
    { id: "harry-potter-3", kind: "quiz", title: "Personnages de la saga", thumbnail: thumb("harry-potter", 3), difficulty: "Facile", tags: ["personnages"], publishedAt: "2026-07-21", trending: false },
    { id: "harry-potter-4", kind: "quiz", title: "Créatures magiques", thumbnail: thumb("harry-potter", 4), difficulty: "Moyen", tags: ["créatures"], publishedAt: "2026-07-03", trending: false },
    { id: "harry-potter-5", kind: "quiz", title: "Quiz expert : l'intrigue complète", thumbnail: thumb("harry-potter", 5), difficulty: "Difficile", tags: ["intrigue", "expert"], publishedAt: "2026-06-24", trending: false },
  ],
  "tests-de-personnalite": [
    { id: "tests-de-personnalite-1", kind: "personality-test", title: "Quel animal êtes-vous ?", thumbnail: thumb("tests-de-personnalite", 1), tags: ["animaux"], publishedAt: "2026-08-14", trending: true },
    { id: "tests-de-personnalite-2", kind: "personality-test", title: "Quel super-héros êtes-vous ?", thumbnail: thumb("tests-de-personnalite", 2), tags: ["super-héros"], publishedAt: "2026-08-08", trending: true },
    { id: "tests-de-personnalite-3", kind: "personality-test", title: "Quel élément es-tu (eau, feu, terre, air) ?", thumbnail: thumb("tests-de-personnalite", 3), tags: ["éléments"], publishedAt: "2026-07-16", trending: false },
    { id: "tests-de-personnalite-4", kind: "personality-test", title: "Quelle ville française es-tu ?", thumbnail: thumb("tests-de-personnalite", 4), tags: ["france", "ville"], publishedAt: "2026-08-12", trending: true },
    { id: "tests-de-personnalite-5", kind: "personality-test", title: "Quel dessert es-tu ?", thumbnail: thumb("tests-de-personnalite", 5), tags: ["gourmand"], publishedAt: "2026-07-02", trending: false },
  ],
  sports: [
    { id: "sports-1", kind: "quiz", title: "Jeux Olympiques : le grand quiz", thumbnail: thumb("sports", 1), difficulty: "Moyen", tags: ["jo", "olympisme"], publishedAt: "2026-08-05", trending: true },
    { id: "sports-2", kind: "quiz", title: "Records sportifs impressionnants", thumbnail: thumb("sports", 2), difficulty: "Difficile", tags: ["records"], publishedAt: "2026-06-29", trending: false },
    { id: "sports-3", kind: "quiz", title: "Sports d'hiver", thumbnail: thumb("sports", 3), difficulty: "Facile", tags: ["hiver", "ski"], publishedAt: "2026-07-13", trending: false },
    { id: "sports-4", kind: "quiz", title: "Tennis : légendes du court", thumbnail: thumb("sports", 4), difficulty: "Moyen", tags: ["tennis"], publishedAt: "2026-08-12", trending: true },
    { id: "sports-5", kind: "quiz", title: "Règles méconnues du sport", thumbnail: thumb("sports", 5), difficulty: "Difficile", tags: ["règles", "expert"], publishedAt: "2026-06-16", trending: false },
  ],
  football: [
    { id: "football-1", kind: "quiz", title: "Quiz Coupe du Monde de Football 2026", thumbnail: thumb("football", 1), difficulty: "Facile", tags: ["coupe du monde"], publishedAt: "2026-08-08", trending: true },
    { id: "football-2", kind: "quiz", title: "Clubs légendaires d'Europe", thumbnail: thumb("football", 2), difficulty: "Moyen", tags: ["clubs", "europe"], publishedAt: "2026-08-03", trending: true },
    { id: "football-3", kind: "quiz", title: "Buteurs et records", thumbnail: thumb("football", 3), difficulty: "Moyen", tags: ["buteurs", "records"], publishedAt: "2026-07-09", trending: false },
    { id: "football-4", kind: "quiz", title: "Règles du football", thumbnail: thumb("football", 4), difficulty: "Facile", tags: ["règles", "débutant"], publishedAt: "2026-07-27", trending: false },
    { id: "football-5", kind: "quiz", title: "Quiz expert : histoire du foot", thumbnail: thumb("football", 5), difficulty: "Difficile", tags: ["histoire", "expert"], publishedAt: "2026-06-21", trending: false },
  ],
  animaux: [
    { id: "animaux-1", kind: "quiz", title: "Animaux sauvages d'Afrique", thumbnail: thumb("animaux", 1), difficulty: "Facile", tags: ["afrique", "faune"], publishedAt: "2026-08-06", trending: true },
    { id: "animaux-2", kind: "quiz", title: "Le monde marin", thumbnail: thumb("animaux", 2), difficulty: "Moyen", tags: ["océan", "faune marine"], publishedAt: "2026-08-11", trending: true },
    { id: "animaux-3", kind: "quiz", title: "Animaux en voie de disparition", thumbnail: thumb("animaux", 3), difficulty: "Moyen", tags: ["conservation"], publishedAt: "2026-07-15", trending: false },
    { id: "animaux-4", kind: "quiz", title: "Insectes surprenants", thumbnail: thumb("animaux", 4), difficulty: "Difficile", tags: ["insectes"], publishedAt: "2026-06-26", trending: false },
    { id: "animaux-5", kind: "quiz", title: "Animaux domestiques : le quiz", thumbnail: thumb("animaux", 5), difficulty: "Facile", tags: ["animaux domestiques"], publishedAt: "2026-07-31", trending: false },
  ],
  nature: [
    { id: "nature-1", kind: "quiz", title: "Écosystèmes de la planète", thumbnail: thumb("nature", 1), difficulty: "Moyen", tags: ["écosystèmes"], publishedAt: "2026-08-04", trending: true },
    { id: "nature-2", kind: "quiz", title: "Phénomènes naturels extrêmes", thumbnail: thumb("nature", 2), difficulty: "Difficile", tags: ["météo", "phénomènes"], publishedAt: "2026-08-13", trending: true },
    { id: "nature-3", kind: "quiz", title: "Forêts du monde", thumbnail: thumb("nature", 3), difficulty: "Facile", tags: ["forêts"], publishedAt: "2026-07-18", trending: false },
    { id: "nature-4", kind: "quiz", title: "Le changement climatique", thumbnail: thumb("nature", 4), difficulty: "Moyen", tags: ["climat", "environnement"], publishedAt: "2026-07-04", trending: false },
    { id: "nature-5", kind: "quiz", title: "Volcans et séismes", thumbnail: thumb("nature", 5), difficulty: "Difficile", tags: ["géologie"], publishedAt: "2026-06-23", trending: false },
  ],
  "langue-francaise": [
    { id: "langue-francaise-1", kind: "quiz", title: "Orthographe : pièges courants", thumbnail: thumb("langue-francaise", 1), difficulty: "Moyen", tags: ["orthographe"], publishedAt: "2026-08-07", trending: true },
    { id: "langue-francaise-2", kind: "quiz", title: "Expressions françaises et leur origine", thumbnail: thumb("langue-francaise", 2), difficulty: "Facile", tags: ["expressions"], publishedAt: "2026-08-14", trending: true },
    { id: "langue-francaise-3", kind: "quiz", title: "Conjugaison : les verbes difficiles", thumbnail: thumb("langue-francaise", 3), difficulty: "Difficile", tags: ["conjugaison"], publishedAt: "2026-06-30", trending: false },
    { id: "langue-francaise-4", kind: "quiz", title: "Étymologie des mots", thumbnail: thumb("langue-francaise", 4), difficulty: "Moyen", tags: ["étymologie"], publishedAt: "2026-07-12", trending: false },
    { id: "langue-francaise-5", kind: "quiz", title: "Quiz facile : vocabulaire de base", thumbnail: thumb("langue-francaise", 5), difficulty: "Facile", tags: ["vocabulaire", "débutant"], publishedAt: "2026-07-29", trending: false },
  ],
  alimentation: [
    { id: "alimentation-1", kind: "quiz", title: "Cuisines du monde", thumbnail: thumb("alimentation", 1), difficulty: "Facile", tags: ["cuisine", "voyage"], publishedAt: "2026-08-02", trending: true },
    { id: "alimentation-2", kind: "quiz", title: "Nutrition : le vrai du faux", thumbnail: thumb("alimentation", 2), difficulty: "Moyen", tags: ["nutrition", "santé"], publishedAt: "2026-08-09", trending: true },
    { id: "alimentation-3", kind: "quiz", title: "Fromages français", thumbnail: thumb("alimentation", 3), difficulty: "Moyen", tags: ["fromage", "france"], publishedAt: "2026-07-24", trending: false },
    { id: "alimentation-4", kind: "quiz", title: "Anecdotes gourmandes", thumbnail: thumb("alimentation", 4), difficulty: "Facile", tags: ["anecdotes"], publishedAt: "2026-07-07", trending: false },
    { id: "alimentation-5", kind: "quiz", title: "Quiz expert : gastronomie", thumbnail: thumb("alimentation", 5), difficulty: "Difficile", tags: ["gastronomie", "expert"], publishedAt: "2026-06-17", trending: false },
  ],
  "code-de-la-route": [
    { id: "code-de-la-route-1", kind: "quiz", title: "Panneaux de signalisation", thumbnail: thumb("code-de-la-route", 1), difficulty: "Facile", tags: ["panneaux", "débutant"], publishedAt: "2026-08-05", trending: true },
    { id: "code-de-la-route-2", kind: "quiz", title: "Priorités et intersections", thumbnail: thumb("code-de-la-route", 2), difficulty: "Moyen", tags: ["priorités"], publishedAt: "2026-08-10", trending: true },
    { id: "code-de-la-route-3", kind: "quiz", title: "Sécurité routière", thumbnail: thumb("code-de-la-route", 3), difficulty: "Moyen", tags: ["sécurité"], publishedAt: "2026-07-20", trending: false },
    { id: "code-de-la-route-4", kind: "quiz", title: "Vitesse et limitations", thumbnail: thumb("code-de-la-route", 4), difficulty: "Facile", tags: ["vitesse"], publishedAt: "2026-07-01", trending: false },
    { id: "code-de-la-route-5", kind: "quiz", title: "Quiz expert avant l'examen", thumbnail: thumb("code-de-la-route", 5), difficulty: "Difficile", tags: ["examen", "expert"], publishedAt: "2026-06-14", trending: false },
  ],
  drapeaux: [
    { id: "drapeaux-1", kind: "quiz", title: "Drapeaux d'Europe", thumbnail: thumb("drapeaux", 1), difficulty: "Facile", tags: ["europe"], publishedAt: "2026-08-03", trending: true },
    { id: "drapeaux-2", kind: "quiz", title: "Drapeaux d'Amérique", thumbnail: thumb("drapeaux", 2), difficulty: "Moyen", tags: ["amérique"], publishedAt: "2026-07-23", trending: false },
    { id: "drapeaux-3", kind: "quiz", title: "Drapeaux d'Afrique", thumbnail: thumb("drapeaux", 3), difficulty: "Moyen", tags: ["afrique"], publishedAt: "2026-08-11", trending: true },
    { id: "drapeaux-4", kind: "quiz", title: "Drapeaux d'Asie", thumbnail: thumb("drapeaux", 4), difficulty: "Difficile", tags: ["asie"], publishedAt: "2026-06-13", trending: false },
    { id: "drapeaux-5", kind: "quiz", title: "Quiz express : reconnais le drapeau", thumbnail: thumb("drapeaux", 5), difficulty: "Facile", tags: ["rapide"], publishedAt: "2026-07-26", trending: false },
  ],
};

export function getMockItemsForCategory(slug: string): MockCategoryItem[] {
  return MOCK_CATEGORY_ITEMS[slug] ?? [];
}
