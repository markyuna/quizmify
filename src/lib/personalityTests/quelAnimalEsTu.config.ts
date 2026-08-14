export const ANIMAL_KEYS = ["lion", "dolphin", "owl", "fox", "wolf", "cat"] as const;
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
      { id: "q1_a", weights: { dolphin: 3, fox: 1 } },
      { id: "q1_b", weights: { owl: 3, cat: 1 } },
      { id: "q1_c", weights: { wolf: 3, lion: 1 } },
      { id: "q1_d", weights: { cat: 3, owl: 1 } },
    ],
  },
  {
    id: "q2",
    options: [
      { id: "q2_a", weights: { lion: 3, wolf: 1 } },
      { id: "q2_b", weights: { owl: 3, fox: 1 } },
      { id: "q2_c", weights: { fox: 3, dolphin: 1 } },
      { id: "q2_d", weights: { cat: 3, lion: 1 } },
    ],
  },
  {
    id: "q3",
    options: [
      { id: "q3_a", weights: { dolphin: 3, owl: 1 } },
      { id: "q3_b", weights: { fox: 3, wolf: 1 } },
      { id: "q3_c", weights: { wolf: 3, lion: 1 } },
      { id: "q3_d", weights: { cat: 3, dolphin: 1 } },
    ],
  },
  {
    id: "q4",
    options: [
      { id: "q4_a", weights: { lion: 3, dolphin: 1 } },
      { id: "q4_b", weights: { owl: 3, cat: 1 } },
      { id: "q4_c", weights: { fox: 3, cat: 1 } },
      { id: "q4_d", weights: { wolf: 3, dolphin: 1 } },
    ],
  },
  {
    id: "q5",
    options: [
      { id: "q5_a", weights: { lion: 3, fox: 1 } },
      { id: "q5_b", weights: { dolphin: 3, wolf: 1 } },
      { id: "q5_c", weights: { owl: 3, fox: 1 } },
      { id: "q5_d", weights: { cat: 3, owl: 1 } },
    ],
  },
  {
    id: "q6",
    options: [
      { id: "q6_a", weights: { dolphin: 3, cat: 1 } },
      { id: "q6_b", weights: { owl: 3, lion: 1 } },
      { id: "q6_c", weights: { fox: 3, cat: 1 } },
      { id: "q6_d", weights: { wolf: 3, dolphin: 1 } },
    ],
  },
  {
    id: "q7",
    options: [
      { id: "q7_a", weights: { lion: 3, fox: 1 } },
      { id: "q7_b", weights: { owl: 3, fox: 1 } },
      { id: "q7_c", weights: { wolf: 3, dolphin: 1 } },
      { id: "q7_d", weights: { cat: 3, owl: 1 } },
    ],
  },
  {
    id: "q8",
    options: [
      { id: "q8_a", weights: { lion: 3, wolf: 1 } },
      { id: "q8_b", weights: { dolphin: 3, wolf: 1 } },
      { id: "q8_c", weights: { fox: 3, owl: 1 } },
      { id: "q8_d", weights: { cat: 3, owl: 1 } },
    ],
  },
];

export const QUEL_ANIMAL_ES_TU_IMAGES: Record<AnimalKey, string> = {
  lion: "/images/tests-personnalite/animal-lion.webp",
  dolphin: "/images/tests-personnalite/animal-dolphin.webp",
  owl: "/images/tests-personnalite/animal-owl.webp",
  fox: "/images/tests-personnalite/animal-fox.webp",
  wolf: "/images/tests-personnalite/animal-wolf.webp",
  cat: "/images/tests-personnalite/animal-cat.webp",
};
