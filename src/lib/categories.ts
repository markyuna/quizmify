// Static config for the category directory/hub pages (/quiz/categoria/[slug]).
// `name`/`seoDescription` live in messages/*.json under `Categories.{slug}.*`
// (see CategoriesSection.tsx, CategorySidebar.tsx, QuizCreation.tsx, and
// generateMetadata in quiz/categoria/[slug]/page.tsx for the consumers) --
// this file only holds non-textual/structural data. `aiPrompt` is left as
// plain text (not user-visible, sourceQuestions() already receives an
// explicit `language` param) so a future generator can read it directly.

// Public Supabase Storage bucket "category-images" (see
// src/lib/categoryImageStorage.ts for the upload helper + how-to-add-a-new-
// image instructions). Not /public/images/... on purpose: a new hero image
// only needs an upload + updating the URL below, no commit/redeploy.
const CATEGORY_IMAGES_BASE_URL =
  "https://etiohbxjwzclursixjze.supabase.co/storage/v1/object/public/category-images";

// Stable ids, not display text -- labels live in messages/*.json under
// `CategoryGroups.{key}` (shared across the categories in that group,
// rather than repeating the label 18 times). Confirmed group is render-only
// today (no persistence, no URL/query param, no analytics) before this
// rename, so there's nothing else to update for the id change itself.
export const CATEGORY_GROUP_KEYS = [
  "culture-generale",
  "culture-sciences",
  "technologie",
  "divertissement",
  "sports",
  "nature-animaux",
  "langues",
  "vie-quotidienne",
] as const;

export type CategoryGroupKey = (typeof CATEGORY_GROUP_KEYS)[number];

export type Category = {
  slug: string;
  icon: string;
  group: CategoryGroupKey;
  // Public URL in the "category-images" Supabase Storage bucket.
  heroImage: string;
  aiPrompt: string;
  // Puzzle Mode renders a DALL-E/gpt-image illustration built directly from
  // the raw topic text (see renderTopicImage() in src/lib/puzzleImage.ts) --
  // a topic under a real-world branded/IP category can trip OpenAI's
  // moderation_blocked just by including the brand name. Categories that
  // are inherently about a specific brand/franchise set this to keep
  // Puzzle Mode off entirely (checked client + server, see QuizCreation.tsx
  // and /api/game/route.ts) instead of relying on per-request failures.
  puzzleModeDisabled?: boolean;
  // Set when the category's entire real-world referent is one specific
  // country's system/institution (not just France-leaning content mixed
  // with world topics, like cinema/histoire/sports) but categoryName
  // doesn't say so in every locale -- appended to categoryScopeBlock in
  // generateQuestionsWithAI so the AI doesn't drift to a generic/other-
  // country interpretation in es/en. See categories.ts's own audit: no
  // other category needs this today.
  countryScope?: string;
};

export const CATEGORIES: Category[] = [
  {
    slug: "culture-generale",
    icon: "📚",
    group: "culture-generale",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/culture-generale-hero.webp",
    aiPrompt:
      "Génère des questions de culture générale variées, couvrant plusieurs domaines (histoire, géographie, sciences, actualité, littérature), de difficulté progressive.",
  },
  {
    slug: "histoire",
    icon: "👑",
    group: "culture-sciences",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/histoire-hero.webp",
    aiPrompt:
      "Génère des questions d'histoire portant sur des événements, des personnages et des dates clés, de l'Antiquité à l'époque contemporaine.",
  },
  {
    slug: "geographie",
    icon: "🌍",
    group: "culture-sciences",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/geographie-hero.webp",
    aiPrompt:
      "Génère des questions de géographie sur les pays, capitales, drapeaux, reliefs et cours d'eau du monde entier.",
  },
  {
    slug: "sciences",
    icon: "⚛️",
    group: "culture-sciences",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/sciences-hero.webp",
    aiPrompt:
      "Génère des questions scientifiques couvrant la physique, la chimie, la biologie et l'astronomie, accessibles à un large public.",
  },
  {
    slug: "arts",
    icon: "🎨",
    group: "culture-sciences",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/arts-hero.webp",
    aiPrompt:
      "Génère des questions sur l'histoire de l'art, les grands artistes, les courants artistiques et les œuvres célèbres.",
  },
  {
    slug: "france",
    icon: "🗼",
    group: "culture-sciences",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/france-hero.webp",
    aiPrompt:
      "Génère des questions sur la France : géographie régionale, monuments, traditions, symboles et faits culturels.",
  },
  {
    slug: "informatica",
    icon: "💻",
    group: "technologie",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/informatic-hero.webp",
    aiPrompt:
      "Génère des questions d'informatique : programmation, bases de données, réseaux, cybersécurité, développement web, structures de données et intelligence artificielle, de difficulté progressive.",
  },
  {
    slug: "cinema",
    icon: "🎬",
    group: "divertissement",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/cinema-hero.webp",
    aiPrompt:
      "Génère des questions sur le cinéma : films cultes, acteurs, réalisateurs, récompenses et répliques célèbres.",
  },
  {
    slug: "disney",
    icon: "🏰",
    group: "divertissement",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/disney-hero.webp",
    aiPrompt:
      "Génère des questions sur l'univers Disney : films d'animation, personnages, chansons et parcs à thème.",
    puzzleModeDisabled: true,
  },
  {
    slug: "harry-potter",
    icon: "⚡",
    group: "divertissement",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/harry-potter-hero.webp",
    aiPrompt:
      "Génère des questions sur l'univers Harry Potter : personnages, sortilèges, maisons de Poudlard et intrigue des livres/films.",
    puzzleModeDisabled: true,
  },
  {
    slug: "tests-de-personnalite",
    icon: "😈",
    group: "divertissement",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/tests-de-personnalite-hero.webp",
    aiPrompt:
      "Génère un test de personnalité avec des questions à choix multiples permettant de dégager un profil parmi plusieurs résultats possibles.",
  },
  {
    slug: "sports",
    icon: "🏀",
    group: "sports",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/sports-hero.webp",
    aiPrompt:
      "Génère des questions sur le sport en général : records, règles, compétitions et athlètes emblématiques.",
  },
  {
    slug: "animaux",
    icon: "🦁",
    group: "nature-animaux",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/animaux-hero.webp",
    aiPrompt:
      "Génère des questions sur les animaux : espèces, comportements, habitats et records du règne animal.",
  },
  {
    slug: "nature",
    icon: "🌱",
    group: "nature-animaux",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/nature-hero.webp",
    aiPrompt:
      "Génère des questions sur la nature : écosystèmes, phénomènes naturels, climat et environnement.",
  },
  {
    slug: "langue-francaise",
    icon: "🔤",
    group: "langues",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/langue-francaise-hero.webp",
    aiPrompt:
      "Génère des questions sur la langue française : orthographe, grammaire, conjugaison, expressions et étymologie.",
  },
  {
    slug: "alimentation",
    icon: "🍔",
    group: "vie-quotidienne",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/alimentation-hero.webp",
    aiPrompt:
      "Génère des questions sur l'alimentation : cuisines du monde, nutrition, ingrédients et anecdotes culinaires.",
  },
  {
    slug: "code-de-la-route",
    icon: "🚗",
    group: "vie-quotidienne",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/code-de-la-route-hero.webp",
    aiPrompt:
      "Génère des questions de type examen du code de la route : panneaux, priorités, règles de circulation et sécurité routière.",
    countryScope: "France",
  },
  {
    slug: "drapeaux",
    icon: "🎌",
    group: "vie-quotidienne",
    heroImage: CATEGORY_IMAGES_BASE_URL + "/drapeaux-hero.webp",
    aiPrompt:
      "Génère des questions permettant d'identifier des drapeaux de pays du monde entier et leur signification.",
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

export type CategoryGroupEntry = {
  group: CategoryGroupKey;
  categories: Category[];
};

// Ordered per CATEGORY_GROUP_KEYS rather than first-appearance in
// CATEGORIES, so the sidebar's group order stays stable regardless of how
// CATEGORIES is sorted/extended later.
export function getCategoriesGroupedByGroup(): CategoryGroupEntry[] {
  return CATEGORY_GROUP_KEYS.map((group) => ({
    group,
    categories: CATEGORIES.filter((category) => category.group === group),
  })).filter((entry) => entry.categories.length > 0);
}
