export const ANIMAL_KEYS = ["lion", "dauphin", "hibou", "renard", "loup", "ours"] as const;
export type AnimalKey = (typeof ANIMAL_KEYS)[number];

export function isAnimalKey(value: string): value is AnimalKey {
  return (ANIMAL_KEYS as readonly string[]).includes(value);
}

export type PersonalityTestOption = {
  id: string;
  // 2-3 animals per option, primary weight 3 / secondary weight 1 -- see
  // the design notes in scoring.ts for how the primary animal is spread
  // across questions so no single animal (or fixed pair) dominates.
  weights: Partial<Record<AnimalKey, number>>;
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
