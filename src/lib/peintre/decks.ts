// The decks for "Qui est le peintre?" -- hand-curated, image-based question
// sets, one per art movement / theme. No AI, no generation. Client-safe
// (PeintreCreation.tsx imports PEINTRE_DECKS for the selection grid), so
// nothing here may touch the Supabase admin client -- image URLs are plain
// strings built from a hardcoded public bucket base, same as the old
// src/lib/curatedQuizzes/quiEstLePeintre.ts.
//
// Painter names (correct_answer / options) are literal French canonical
// forms, NOT translated -- proper nouns, same stance as the old curated
// definition. Artwork titles, question sentences and explanations ARE
// localized, via messages/{fr,es,en}.json under Peintre.decks.<deckKey>.

const BUCKET_BASE =
  "https://etiohbxjwzclursixjze.supabase.co/storage/v1/object/public/curated-quiz-images/qui-est-le-peintre";

export type PeintreQuestion = {
  // Used both as the messages key (Peintre.decks.<deckKey>.titles/explanations
  // .<slug>) and as the .webp filename in the deck's image folder.
  slug: string;
  // The painter -- literal string, matched case-insensitively on submit.
  correct_answer: string;
  // Exactly 4, correct answer included, NOT yet shuffled. ensureValidOptions
  // shuffles the display order per play (same as every other MCQ quiz).
  options: string[];
};

export type PeintreDeck = {
  // Persisted on PeintreGame.deckKey. Validated via findPeintreDeck.
  deckKey: string;
  // Public Supabase Storage folder for this deck's images. Each question's
  // image is `${imageBaseUrl}/${slug}.webp`.
  imageBaseUrl: string;
  // Which question's image represents the deck on the selection grid.
  coverSlug: string;
  questions: PeintreQuestion[];
};

// The 10 works the game shipped with as a curated quiz. Named "classiques"
// (not "impressionnisme") because the set is mostly non-Impressionist --
// Botticelli (Renaissance), Klimt (Symbolism), van Gogh (Post-Impressionism),
// Wood (Regionalism)... "impressionnisme" below is the deck of genuinely
// Impressionist works. Images stay at the flat bucket path they were
// uploaded to as a curated quiz -- no file move on migration.
const CLASSIQUES_DECK: PeintreDeck = {
  deckKey: "classiques",
  imageBaseUrl: BUCKET_BASE,
  coverSlug: "joconde",
  questions: [
    {
      slug: "nuit-etoilee",
      correct_answer: "Vincent van Gogh",
      options: ["Vincent van Gogh", "Léonard de Vinci", "Sandro Botticelli", "Édouard Manet"],
    },
    {
      slug: "joconde",
      correct_answer: "Léonard de Vinci",
      options: ["Léonard de Vinci", "Edvard Munch", "Claude Monet", "Johannes Vermeer"],
    },
    {
      slug: "le-cri",
      correct_answer: "Edvard Munch",
      options: ["Edvard Munch", "Sandro Botticelli", "Eugène Delacroix", "Gustav Klimt"],
    },
    {
      slug: "naissance-de-venus",
      correct_answer: "Sandro Botticelli",
      options: ["Sandro Botticelli", "Claude Monet", "Édouard Manet", "Grant Wood"],
    },
    {
      slug: "nympheas",
      correct_answer: "Claude Monet",
      options: ["Claude Monet", "Eugène Delacroix", "Johannes Vermeer", "Vincent van Gogh"],
    },
    {
      slug: "liberte-guidant-le-peuple",
      correct_answer: "Eugène Delacroix",
      options: ["Eugène Delacroix", "Édouard Manet", "Gustav Klimt", "Léonard de Vinci"],
    },
    {
      slug: "dejeuner-sur-l-herbe",
      correct_answer: "Édouard Manet",
      options: ["Édouard Manet", "Johannes Vermeer", "Grant Wood", "Edvard Munch"],
    },
    {
      slug: "jeune-fille-a-la-perle",
      correct_answer: "Johannes Vermeer",
      options: ["Johannes Vermeer", "Gustav Klimt", "Vincent van Gogh", "Sandro Botticelli"],
    },
    {
      slug: "le-baiser",
      correct_answer: "Gustav Klimt",
      options: ["Gustav Klimt", "Grant Wood", "Léonard de Vinci", "Claude Monet"],
    },
    {
      slug: "american-gothic",
      correct_answer: "Grant Wood",
      options: ["Grant Wood", "Vincent van Gogh", "Edvard Munch", "Eugène Delacroix"],
    },
  ],
};

// Renaissance deck. Closed pool of these 10 painters: each is the correct
// answer exactly once and a distractor exactly 3 times. Images in the
// `renaissance/` subfolder. All 10 sources verified public domain / CC0 on
// Wikimedia Commons before upload (no CC-BY / CC-BY-SA).
const RENAISSANCE_DECK: PeintreDeck = {
  deckKey: "renaissance",
  imageBaseUrl: `${BUCKET_BASE}/renaissance`,
  coverSlug: "ecole-d-athenes",
  questions: [
    {
      slug: "ecole-d-athenes",
      correct_answer: "Raphaël",
      options: ["Raphaël", "Michel-Ange", "Hans Holbein le Jeune", "Piero della Francesca"],
    },
    {
      slug: "creation-d-adam",
      correct_answer: "Michel-Ange",
      options: ["Michel-Ange", "Raphaël", "Paolo Uccello", "Titien"],
    },
    {
      slug: "les-epoux-arnolfini",
      correct_answer: "Jan van Eyck",
      options: ["Jan van Eyck", "Hans Holbein le Jeune", "Albrecht Dürer", "Jérôme Bosch"],
    },
    {
      slug: "jardin-des-delices",
      correct_answer: "Jérôme Bosch",
      options: ["Jérôme Bosch", "Piero della Francesca", "Titien", "Domenico Ghirlandaio"],
    },
    {
      slug: "venus-d-urbin",
      correct_answer: "Titien",
      options: ["Titien", "Paolo Uccello", "Jan van Eyck", "Michel-Ange"],
    },
    {
      slug: "les-ambassadeurs",
      correct_answer: "Hans Holbein le Jeune",
      options: ["Hans Holbein le Jeune", "Raphaël", "Jan van Eyck", "Albrecht Dürer"],
    },
    {
      slug: "autoportrait-a-la-pelisse",
      correct_answer: "Albrecht Dürer",
      options: ["Albrecht Dürer", "Jan van Eyck", "Hans Holbein le Jeune", "Domenico Ghirlandaio"],
    },
    {
      slug: "saint-georges-et-le-dragon",
      correct_answer: "Paolo Uccello",
      options: ["Paolo Uccello", "Michel-Ange", "Piero della Francesca", "Jérôme Bosch"],
    },
    {
      slug: "bapteme-du-christ",
      correct_answer: "Piero della Francesca",
      options: ["Piero della Francesca", "Raphaël", "Titien", "Domenico Ghirlandaio"],
    },
    {
      slug: "portrait-vieillard-petit-fils",
      correct_answer: "Domenico Ghirlandaio",
      options: ["Domenico Ghirlandaio", "Jérôme Bosch", "Albrecht Dürer", "Paolo Uccello"],
    },
  ],
};

// Impressionism deck. Same closed-pool distractor pattern as Renaissance:
// each of these 10 painters is the correct answer exactly once and a
// distractor exactly 3 times. Images in the `impressionnisme/` subfolder.
// All 10 sources verified public domain / CC0 on Wikimedia Commons before
// upload (no CC-BY / CC-BY-SA).
const IMPRESSIONNISME_DECK: PeintreDeck = {
  deckKey: "impressionnisme",
  imageBaseUrl: `${BUCKET_BASE}/impressionnisme`,
  coverSlug: "bal-du-moulin-de-la-galette",
  questions: [
    {
      slug: "bal-du-moulin-de-la-galette",
      correct_answer: "Pierre-Auguste Renoir",
      options: ["Pierre-Auguste Renoir", "Edgar Degas", "Georges Seurat", "Gustave Caillebotte"],
    },
    {
      slug: "la-classe-de-danse",
      correct_answer: "Edgar Degas",
      options: ["Edgar Degas", "Georges Seurat", "Gustave Caillebotte", "Mary Cassatt"],
    },
    {
      slug: "un-dimanche-a-la-grande-jatte",
      correct_answer: "Georges Seurat",
      options: ["Georges Seurat", "Gustave Caillebotte", "Mary Cassatt", "Paul Cézanne"],
    },
    {
      slug: "rue-de-paris-temps-de-pluie",
      correct_answer: "Gustave Caillebotte",
      options: ["Gustave Caillebotte", "Mary Cassatt", "Paul Cézanne", "Paul Gauguin"],
    },
    {
      slug: "la-toilette-de-l-enfant",
      correct_answer: "Mary Cassatt",
      options: ["Mary Cassatt", "Paul Cézanne", "Paul Gauguin", "Henri de Toulouse-Lautrec"],
    },
    {
      slug: "les-joueurs-de-cartes",
      correct_answer: "Paul Cézanne",
      options: ["Paul Cézanne", "Paul Gauguin", "Henri de Toulouse-Lautrec", "Camille Pissarro"],
    },
    {
      slug: "d-ou-venons-nous",
      correct_answer: "Paul Gauguin",
      options: ["Paul Gauguin", "Henri de Toulouse-Lautrec", "Camille Pissarro", "Alfred Sisley"],
    },
    {
      slug: "moulin-rouge-la-goulue",
      correct_answer: "Henri de Toulouse-Lautrec",
      options: [
        "Henri de Toulouse-Lautrec",
        "Camille Pissarro",
        "Alfred Sisley",
        "Pierre-Auguste Renoir",
      ],
    },
    {
      slug: "boulevard-montmartre-la-nuit",
      correct_answer: "Camille Pissarro",
      options: ["Camille Pissarro", "Alfred Sisley", "Pierre-Auguste Renoir", "Edgar Degas"],
    },
    {
      slug: "le-pont-de-moret",
      correct_answer: "Alfred Sisley",
      options: ["Alfred Sisley", "Pierre-Auguste Renoir", "Edgar Degas", "Georges Seurat"],
    },
  ],
};

export const PEINTRE_DECKS: PeintreDeck[] = [CLASSIQUES_DECK, RENAISSANCE_DECK, IMPRESSIONNISME_DECK];

export function findPeintreDeck(deckKey: string | null | undefined): PeintreDeck | null {
  if (!deckKey) return null;
  return PEINTRE_DECKS.find((d) => d.deckKey === deckKey) ?? null;
}

export function peintreImageUrl(deck: PeintreDeck, slug: string): string {
  return `${deck.imageBaseUrl}/${slug}.webp`;
}
