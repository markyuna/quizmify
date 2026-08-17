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
export const QUI_EST_LE_PEINTRE: CuratedQuizDefinition = {
  categorySlug: "arts",
  topicDisplay: "Qui est le peintre?",
  topicNormalized: "Qui est le peintre?",
  language: "fr",
  difficulty: "medium",
  questions: [
    {
      question: "Qui a peint « La Nuit étoilée » ?",
      imageUrl: `${IMAGES_BASE_URL}/nuit-etoilee.webp`,
      correct_answer: "Vincent van Gogh",
      options: ["Vincent van Gogh", "Léonard de Vinci", "Sandro Botticelli", "Édouard Manet"],
      explanation:
        "Vincent van Gogh peint « La Nuit étoilée » en 1889, depuis la fenêtre de sa chambre à l'asile de Saint-Rémy-de-Provence.",
    },
    {
      question: "Qui a peint « La Joconde » ?",
      imageUrl: `${IMAGES_BASE_URL}/joconde.webp`,
      correct_answer: "Léonard de Vinci",
      options: ["Léonard de Vinci", "Edvard Munch", "Claude Monet", "Johannes Vermeer"],
      explanation:
        "Léonard de Vinci peint « La Joconde » au début du XVIe siècle ; le tableau est exposé au musée du Louvre.",
    },
    {
      question: "Qui a peint « Le Cri » ?",
      imageUrl: `${IMAGES_BASE_URL}/le-cri.webp`,
      correct_answer: "Edvard Munch",
      options: ["Edvard Munch", "Sandro Botticelli", "Eugène Delacroix", "Gustav Klimt"],
      explanation:
        "Edvard Munch peint « Le Cri » en 1893, une œuvre emblématique de l'expressionnisme.",
    },
    {
      question: "Qui a peint « La Naissance de Vénus » ?",
      imageUrl: `${IMAGES_BASE_URL}/naissance-de-venus.webp`,
      correct_answer: "Sandro Botticelli",
      options: ["Sandro Botticelli", "Claude Monet", "Édouard Manet", "Grant Wood"],
      explanation:
        "Sandro Botticelli peint « La Naissance de Vénus » vers 1485, une œuvre majeure de la Renaissance italienne.",
    },
    {
      question: "Qui a peint « Les Nymphéas » ?",
      imageUrl: `${IMAGES_BASE_URL}/nympheas.webp`,
      correct_answer: "Claude Monet",
      options: ["Claude Monet", "Eugène Delacroix", "Johannes Vermeer", "Vincent van Gogh"],
      explanation:
        "Claude Monet peint la série des « Nymphéas » depuis le jardin de sa maison à Giverny, un sommet de l'impressionnisme.",
    },
    {
      question: "Qui a peint « La Liberté guidant le peuple » ?",
      imageUrl: `${IMAGES_BASE_URL}/liberte-guidant-le-peuple.webp`,
      correct_answer: "Eugène Delacroix",
      options: ["Eugène Delacroix", "Édouard Manet", "Gustav Klimt", "Léonard de Vinci"],
      explanation:
        "Eugène Delacroix peint « La Liberté guidant le peuple » en 1830, pour commémorer la révolution de Juillet.",
    },
    {
      question: "Qui a peint « Le Déjeuner sur l'herbe » ?",
      imageUrl: `${IMAGES_BASE_URL}/dejeuner-sur-l-herbe.webp`,
      correct_answer: "Édouard Manet",
      options: ["Édouard Manet", "Johannes Vermeer", "Grant Wood", "Edvard Munch"],
      explanation:
        "Édouard Manet peint « Le Déjeuner sur l'herbe » en 1863 ; le tableau fait scandale au Salon des Refusés.",
    },
    {
      question: "Qui a peint « La Jeune Fille à la perle » ?",
      imageUrl: `${IMAGES_BASE_URL}/jeune-fille-a-la-perle.webp`,
      correct_answer: "Johannes Vermeer",
      options: ["Johannes Vermeer", "Gustav Klimt", "Vincent van Gogh", "Sandro Botticelli"],
      explanation:
        "Johannes Vermeer peint « La Jeune Fille à la perle » vers 1665, surnommée la « Joconde du Nord ».",
    },
    {
      question: "Qui a peint « Le Baiser » ?",
      imageUrl: `${IMAGES_BASE_URL}/le-baiser.webp`,
      correct_answer: "Gustav Klimt",
      options: ["Gustav Klimt", "Grant Wood", "Léonard de Vinci", "Claude Monet"],
      explanation:
        "Gustav Klimt peint « Le Baiser » entre 1907 et 1908, œuvre phare de sa période dorée et de la Sécession viennoise.",
    },
    {
      question: "Qui a peint « American Gothic » ?",
      imageUrl: `${IMAGES_BASE_URL}/american-gothic.webp`,
      correct_answer: "Grant Wood",
      options: ["Grant Wood", "Vincent van Gogh", "Edvard Munch", "Eugène Delacroix"],
      explanation:
        "Grant Wood peint « American Gothic » en 1930, devenu une icône du régionalisme américain.",
    },
  ],
};
