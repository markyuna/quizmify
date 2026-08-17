import type { CuratedQuizDefinition } from "./types";

// Public Supabase Storage bucket "curated-quiz-images", subfolder
// "qui-est-le-peintre" (see src/lib/curatedQuizImageStorage.ts) -- a shared
// bucket with one subfolder per curated topic, not a dedicated bucket, so
// future curated topics reuse the same bucket/helper instead of each
// provisioning their own.
const IMAGES_BASE_URL =
  "https://etiohbxjwzclursixjze.supabase.co/storage/v1/object/public/curated-quiz-images/qui-est-le-peintre";

// All 10 works verified public domain on Wikimedia Commons (PD-old-100-expired
// or CC-PD-Mark, author's death + Berne/US term both expired) before curation
// -- see the license check done ahead of this file's creation. No CC BY-SA
// (attribution-required) sources used.
//
// `titleKey` looks up the localized artwork title + question sentence +
// explanation in messages/{en,es,fr}.json under CuratedQuizzes.QuiEstLePeintre
// -- resolved server-side at Question-row creation time (see the curated
// branch in /api/game/route.ts), using the request's own locale, not the
// fr-only language on this definition (that field only describes the fixed
// image/distractor content, see registry.ts's comment on why it's not a
// match key). Painter names (correct_answer/options) are NOT translated --
// proper nouns, same in all 3 locales.
export const QUI_EST_LE_PEINTRE: CuratedQuizDefinition = {
  categorySlug: "arts",
  topicDisplay: "Qui est le peintre?",
  topicNormalized: "Qui est le peintre?",
  language: "fr",
  difficulty: "medium",
  translationNamespace: "CuratedQuizzes.QuiEstLePeintre",
  questions: [
    {
      titleKey: "nuit-etoilee",
      imageUrl: `${IMAGES_BASE_URL}/nuit-etoilee.webp`,
      correct_answer: "Vincent van Gogh",
      options: ["Vincent van Gogh", "Léonard de Vinci", "Sandro Botticelli", "Édouard Manet"],
    },
    {
      titleKey: "joconde",
      imageUrl: `${IMAGES_BASE_URL}/joconde.webp`,
      correct_answer: "Léonard de Vinci",
      options: ["Léonard de Vinci", "Edvard Munch", "Claude Monet", "Johannes Vermeer"],
    },
    {
      titleKey: "le-cri",
      imageUrl: `${IMAGES_BASE_URL}/le-cri.webp`,
      correct_answer: "Edvard Munch",
      options: ["Edvard Munch", "Sandro Botticelli", "Eugène Delacroix", "Gustav Klimt"],
    },
    {
      titleKey: "naissance-de-venus",
      imageUrl: `${IMAGES_BASE_URL}/naissance-de-venus.webp`,
      correct_answer: "Sandro Botticelli",
      options: ["Sandro Botticelli", "Claude Monet", "Édouard Manet", "Grant Wood"],
    },
    {
      titleKey: "nympheas",
      imageUrl: `${IMAGES_BASE_URL}/nympheas.webp`,
      correct_answer: "Claude Monet",
      options: ["Claude Monet", "Eugène Delacroix", "Johannes Vermeer", "Vincent van Gogh"],
    },
    {
      titleKey: "liberte-guidant-le-peuple",
      imageUrl: `${IMAGES_BASE_URL}/liberte-guidant-le-peuple.webp`,
      correct_answer: "Eugène Delacroix",
      options: ["Eugène Delacroix", "Édouard Manet", "Gustav Klimt", "Léonard de Vinci"],
    },
    {
      titleKey: "dejeuner-sur-l-herbe",
      imageUrl: `${IMAGES_BASE_URL}/dejeuner-sur-l-herbe.webp`,
      correct_answer: "Édouard Manet",
      options: ["Édouard Manet", "Johannes Vermeer", "Grant Wood", "Edvard Munch"],
    },
    {
      titleKey: "jeune-fille-a-la-perle",
      imageUrl: `${IMAGES_BASE_URL}/jeune-fille-a-la-perle.webp`,
      correct_answer: "Johannes Vermeer",
      options: ["Johannes Vermeer", "Gustav Klimt", "Vincent van Gogh", "Sandro Botticelli"],
    },
    {
      titleKey: "le-baiser",
      imageUrl: `${IMAGES_BASE_URL}/le-baiser.webp`,
      correct_answer: "Gustav Klimt",
      options: ["Gustav Klimt", "Grant Wood", "Léonard de Vinci", "Claude Monet"],
    },
    {
      titleKey: "american-gothic",
      imageUrl: `${IMAGES_BASE_URL}/american-gothic.webp`,
      correct_answer: "Grant Wood",
      options: ["Grant Wood", "Vincent van Gogh", "Edvard Munch", "Eugène Delacroix"],
    },
  ],
};
