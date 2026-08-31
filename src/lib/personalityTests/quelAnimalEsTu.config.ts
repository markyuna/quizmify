export const ANIMAL_KEYS = ["lion", "dauphin", "hibou", "renard", "loup", "ours"] as const;
export type AnimalKey = (typeof ANIMAL_KEYS)[number];

export function isAnimalKey(value: string): value is AnimalKey {
  return (ANIMAL_KEYS as readonly string[]).includes(value);
}

// The real quiz-topic category slugs from src/lib/categories.ts, minus
// "tests-de-personnalite" (that's this test's own entry point, not a topic
// someone can be recommended). Kept as its own literal list rather than
// derived from CATEGORIES (whose `slug` is typed as plain `string`) --
// order matters here: it's the tie-break catalog order for categoryScores,
// same role ANIMAL_KEYS plays for the animal axis. Must stay in sync with
// categories.ts by hand.
export const CATEGORY_SLUGS = [
  "culture-generale",
  "histoire",
  "geographie",
  "sciences",
  "arts",
  "france",
  "informatica",
  "cinema",
  "disney",
  "harry-potter",
  "sports",
  "animaux",
  "nature",
  "langue-francaise",
  "alimentation",
  "code-de-la-route",
  "drapeaux",
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export type PersonalityTestOption = {
  id: string;
  // 2-3 animals per option, primary weight 3 / secondary weight 1 -- see
  // the design notes in scoring.ts for how the primary animal is spread
  // across questions so no single animal (or fixed pair) dominates.
  weights: Partial<Record<AnimalKey, number>>;
  // Only present on Q9-13 (the thematic/interest axis added for cold-start
  // recommendations) -- primary weight 3 / secondary weight 1, same scale
  // as `weights` but on a completely separate axis: these questions'
  // `weights` are deliberately empty so they don't affect the animal
  // result. Feeds PersonalityTestAttempt.categoryScores, not `scores`.
  categoryWeights?: Partial<Record<CategorySlug, number>>;
};

export type PersonalityTestQuestion = {
  id: string;
  options: PersonalityTestOption[];
};

/**
 * "Quel animal es-tu ?" -- 8 questions, 4 options each. Text (prompts,
 * option labels, animal profile copy) lives in messages/*.json under
 * PersonalityTests.quelAnimalEsTu, keyed by these same question/option/
 * animal ids -- this file only holds the structural scoring data.
 *
 * Each question's 4 options cover 4 of the 6 animals as "primary" (weight
 * 3); the other 2 animals only show up as a "secondary" (weight 1) on
 * someone else's option that question, if at all. Which 4 are primary
 * rotates question to question (see QUESTIONS below) so every animal is
 * primary on 5-6 of the 32 total options, and no two animals are always
 * paired as primary/secondary -- avoids the quiz collapsing into
 * systematic ties between the same two animals.
 */
export const QUESTIONS: PersonalityTestQuestion[] = [
  {
    id: "q1",
    options: [
      { id: "q1_a", weights: { dauphin: 3, renard: 1 } },
      { id: "q1_b", weights: { hibou: 3, ours: 1 } },
      { id: "q1_c", weights: { loup: 3, lion: 1 } },
      { id: "q1_d", weights: { ours: 3, hibou: 1 } },
    ],
  },
  {
    id: "q2",
    options: [
      { id: "q2_a", weights: { lion: 3, loup: 1 } },
      { id: "q2_b", weights: { hibou: 3, renard: 1 } },
      { id: "q2_c", weights: { renard: 3, dauphin: 1 } },
      { id: "q2_d", weights: { ours: 3, lion: 1 } },
    ],
  },
  {
    id: "q3",
    options: [
      { id: "q3_a", weights: { dauphin: 3, hibou: 1 } },
      { id: "q3_b", weights: { renard: 3, loup: 1 } },
      { id: "q3_c", weights: { loup: 3, lion: 1 } },
      { id: "q3_d", weights: { ours: 3, dauphin: 1 } },
    ],
  },
  {
    id: "q4",
    options: [
      { id: "q4_a", weights: { lion: 3, dauphin: 1 } },
      { id: "q4_b", weights: { hibou: 3, ours: 1 } },
      { id: "q4_c", weights: { renard: 3, ours: 1 } },
      { id: "q4_d", weights: { loup: 3, dauphin: 1 } },
    ],
  },
  {
    id: "q5",
    options: [
      { id: "q5_a", weights: { lion: 3, renard: 1 } },
      { id: "q5_b", weights: { dauphin: 3, loup: 1 } },
      { id: "q5_c", weights: { hibou: 3, renard: 1 } },
      { id: "q5_d", weights: { ours: 3, hibou: 1 } },
    ],
  },
  {
    id: "q6",
    options: [
      { id: "q6_a", weights: { dauphin: 3, ours: 1 } },
      { id: "q6_b", weights: { hibou: 3, lion: 1 } },
      { id: "q6_c", weights: { renard: 3, ours: 1 } },
      { id: "q6_d", weights: { loup: 3, dauphin: 1 } },
    ],
  },
  {
    id: "q7",
    options: [
      { id: "q7_a", weights: { lion: 3, renard: 1 } },
      { id: "q7_b", weights: { hibou: 3, renard: 1 } },
      { id: "q7_c", weights: { loup: 3, dauphin: 1 } },
      { id: "q7_d", weights: { ours: 3, hibou: 1 } },
    ],
  },
  {
    id: "q8",
    options: [
      { id: "q8_a", weights: { lion: 3, loup: 1 } },
      { id: "q8_b", weights: { dauphin: 3, loup: 1 } },
      { id: "q8_c", weights: { renard: 3, hibou: 1 } },
      { id: "q8_d", weights: { ours: 3, hibou: 1 } },
    ],
  },
  // Q9-13: thematic/interest axis for cold-start topic recommendations
  // (Phase 1 of the "mascot + recommendations" feature). `weights` is
  // deliberately empty on every option here -- these questions must not
  // move the animal result, only categoryWeights.
  {
    id: "q9",
    options: [
      { id: "q9_a", weights: {}, categoryWeights: { animaux: 3, sciences: 1 } },
      { id: "q9_b", weights: {}, categoryWeights: { cinema: 3, disney: 1 } },
      { id: "q9_c", weights: {}, categoryWeights: { sports: 4 } },
      { id: "q9_d", weights: {}, categoryWeights: { histoire: 3, "culture-generale": 1 } },
    ],
  },
  {
    id: "q10",
    options: [
      { id: "q10_a", weights: {}, categoryWeights: { geographie: 3, drapeaux: 1 } },
      { id: "q10_b", weights: {}, categoryWeights: { histoire: 3, france: 1 } },
      { id: "q10_c", weights: {}, categoryWeights: { animaux: 3, nature: 1 } },
      { id: "q10_d", weights: {}, categoryWeights: { alimentation: 3, "culture-generale": 1 } },
    ],
  },
  {
    id: "q11",
    options: [
      { id: "q11_a", weights: {}, categoryWeights: { cinema: 3 } },
      { id: "q11_b", weights: {}, categoryWeights: { disney: 3, cinema: 1 } },
      { id: "q11_c", weights: {}, categoryWeights: { cinema: 3, "harry-potter": 1 } },
      { id: "q11_d", weights: {}, categoryWeights: { histoire: 3, cinema: 1 } },
    ],
  },
  {
    id: "q12",
    options: [
      { id: "q12_a", weights: {}, categoryWeights: { sports: 4 } },
      { id: "q12_b", weights: {}, categoryWeights: { "langue-francaise": 3 } },
      { id: "q12_c", weights: {}, categoryWeights: { drapeaux: 3, geographie: 1 } },
      { id: "q12_d", weights: {}, categoryWeights: { "code-de-la-route": 3 } },
    ],
  },
  {
    id: "q13",
    options: [
      { id: "q13_a", weights: {}, categoryWeights: { arts: 3, "culture-generale": 1 } },
      { id: "q13_b", weights: {}, categoryWeights: { "harry-potter": 3, cinema: 1 } },
      { id: "q13_c", weights: {}, categoryWeights: { sciences: 3, histoire: 1 } },
      { id: "q13_d", weights: {}, categoryWeights: { nature: 3, animaux: 1 } },
    ],
  },
];

// Public Supabase Storage bucket "category-images" -- shares the bucket
// with categories.ts's hero images rather than a dedicated one, since these
// are the same kind of static, rarely-changing asset. See
// src/lib/categoryImageStorage.ts for the upload helper.
const CATEGORY_IMAGES_BASE_URL =
  "https://etiohbxjwzclursixjze.supabase.co/storage/v1/object/public/category-images";

export const QUEL_ANIMAL_ES_TU_IMAGES: Record<AnimalKey, string> = {
  lion: CATEGORY_IMAGES_BASE_URL + "/animal-lion.webp",
  dauphin: CATEGORY_IMAGES_BASE_URL + "/animal-dauphin.webp",
  hibou: CATEGORY_IMAGES_BASE_URL + "/animal-hibou.webp",
  renard: CATEGORY_IMAGES_BASE_URL + "/animal-renard.webp",
  loup: CATEGORY_IMAGES_BASE_URL + "/animal-loup.webp",
  ours: CATEGORY_IMAGES_BASE_URL + "/animal-ours.webp",
};
