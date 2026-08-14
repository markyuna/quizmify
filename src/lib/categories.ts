// Static config for the category directory/hub pages (/quiz/categoria/[slug]).
// This is mock-phase content: no AI generation, no DB -- hand-written French
// copy per category, and `aiPrompt` is defined now so a future generator can
// read it directly without a schema change, even though nothing calls it yet.

export const CATEGORY_GROUPS = [
  "Culture Générale",
  "Culture & Sciences",
  "Divertissement",
  "Sports",
  "Nature & Animaux",
  "Langues",
  "Vie Quotidienne",
] as const;

export type CategoryGroup = (typeof CATEGORY_GROUPS)[number];

export type Category = {
  slug: string;
  name: string;
  icon: string;
  group: CategoryGroup;
  // Assumed to exist under /public/images/categories/{slug}-hero.webp --
  // this phase only wires up the config, the asset itself isn't generated.
  heroImage: string;
  seoDescription: string;
  aiPrompt: string;
};

export const CATEGORIES: Category[] = [
  {
    slug: "culture-generale",
    name: "Culture Générale",
    icon: "📚",
    group: "Culture Générale",
    heroImage: "/images/categories/culture-generale-hero.webp",
    seoDescription:
      "Testez vos connaissances générales avec des quiz variés couvrant l'histoire, la géographie, les sciences et bien plus. Idéal pour s'entraîner avant un jeu télévisé ou simplement pour le plaisir d'apprendre.",
    aiPrompt:
      "Génère des questions de culture générale variées, couvrant plusieurs domaines (histoire, géographie, sciences, actualité, littérature), de difficulté progressive.",
  },
  {
    slug: "histoire",
    name: "Histoire",
    icon: "👑",
    group: "Culture & Sciences",
    heroImage: "/images/categories/histoire-hero.webp",
    seoDescription:
      "Des quiz sur les grandes dates, les personnages marquants et les événements qui ont façonné le monde, de l'Antiquité à l'époque contemporaine.",
    aiPrompt:
      "Génère des questions d'histoire portant sur des événements, des personnages et des dates clés, de l'Antiquité à l'époque contemporaine.",
  },
  {
    slug: "geographie",
    name: "Géographie",
    icon: "🌍",
    group: "Culture & Sciences",
    heroImage: "/images/categories/geographie-hero.webp",
    seoDescription:
      "Capitales, pays, fleuves, reliefs... Partez à la découverte du monde à travers des quiz de géographie pour tester votre sens de l'orientation et vos connaissances du globe.",
    aiPrompt:
      "Génère des questions de géographie sur les pays, capitales, drapeaux, reliefs et cours d'eau du monde entier.",
  },
  {
    slug: "sciences",
    name: "Sciences",
    icon: "⚛️",
    group: "Culture & Sciences",
    heroImage: "/images/categories/sciences-hero.webp",
    seoDescription:
      "Physique, chimie, biologie, astronomie... Explorez l'univers des sciences avec des quiz qui mêlent découvertes historiques et notions fondamentales.",
    aiPrompt:
      "Génère des questions scientifiques couvrant la physique, la chimie, la biologie et l'astronomie, accessibles à un large public.",
  },
  {
    slug: "arts",
    name: "Arts",
    icon: "🎨",
    group: "Culture & Sciences",
    heroImage: "/images/categories/arts-hero.webp",
    seoDescription:
      "Peinture, sculpture, courants artistiques et grands artistes : testez votre culture artistique à travers les siècles avec ces quiz dédiés aux arts.",
    aiPrompt:
      "Génère des questions sur l'histoire de l'art, les grands artistes, les courants artistiques et les œuvres célèbres.",
  },
  {
    slug: "france",
    name: "La France",
    icon: "🇫🇷",
    group: "Culture & Sciences",
    heroImage: "/images/categories/france-hero.webp",
    seoDescription:
      "Régions, monuments, traditions et symboles : (re)découvrez la France sous toutes ses coutures grâce à des quiz 100% dédiés à l'Hexagone.",
    aiPrompt:
      "Génère des questions sur la France : géographie régionale, monuments, traditions, symboles et faits culturels.",
  },
  {
    slug: "cinema",
    name: "Cinéma",
    icon: "🎬",
    group: "Divertissement",
    heroImage: "/images/categories/cinema-hero.webp",
    seoDescription:
      "Films cultes, acteurs, réalisateurs et répliques mythiques : plongez dans l'univers du septième art avec des quiz pour tous les cinéphiles.",
    aiPrompt:
      "Génère des questions sur le cinéma : films cultes, acteurs, réalisateurs, récompenses et répliques célèbres.",
  },
  {
    slug: "disney",
    name: "Disney",
    icon: "🏰",
    group: "Divertissement",
    heroImage: "/images/categories/disney-hero.webp",
    seoDescription:
      "Des classiques d'animation aux dernières sorties, testez votre connaissance de l'univers magique de Disney : personnages, chansons et histoires inoubliables.",
    aiPrompt:
      "Génère des questions sur l'univers Disney : films d'animation, personnages, chansons et parcs à thème.",
  },
  {
    slug: "harry-potter",
    name: "Harry Potter",
    icon: "⚡",
    group: "Divertissement",
    heroImage: "/images/categories/harry-potter-hero.webp",
    seoDescription:
      "Poudlard n'aura plus aucun secret pour vous ! Sortilèges, personnages, maisons et objets magiques : des quiz pensés pour les fans de la saga.",
    aiPrompt:
      "Génère des questions sur l'univers Harry Potter : personnages, sortilèges, maisons de Poudlard et intrigue des livres/films.",
  },
  {
    slug: "tests-de-personnalite",
    name: "Tests de personnalité",
    icon: "😈",
    group: "Divertissement",
    heroImage: "/images/categories/tests-de-personnalite-hero.webp",
    seoDescription:
      "Découvrez qui vous êtes vraiment grâce à nos tests de personnalité ludiques : quel animal, quel personnage ou quel élément vous correspond le mieux ?",
    aiPrompt:
      "Génère un test de personnalité avec des questions à choix multiples permettant de dégager un profil parmi plusieurs résultats possibles.",
  },
  {
    slug: "sports",
    name: "Sports",
    icon: "🏀",
    group: "Sports",
    heroImage: "/images/categories/sports-hero.webp",
    seoDescription:
      "Des records olympiques aux règles méconnues, testez votre culture sportive tous sports confondus avec ces quiz pour les passionnés.",
    aiPrompt:
      "Génère des questions sur le sport en général : records, règles, compétitions et athlètes emblématiques.",
  },
  {
    slug: "football",
    name: "Football",
    icon: "⚽",
    group: "Sports",
    heroImage: "/images/categories/football-hero.webp",
    seoDescription:
      "Coupes du monde, clubs légendaires et joueurs mythiques : le quiz parfait pour les passionnés du ballon rond.",
    aiPrompt:
      "Génère des questions sur le football : Coupe du monde, clubs, joueurs, records et règles du jeu.",
  },
  {
    slug: "animaux",
    name: "Animaux",
    icon: "🦁",
    group: "Nature & Animaux",
    heroImage: "/images/categories/animaux-hero.webp",
    seoDescription:
      "Des espèces les plus communes aux plus surprenantes, partez à la découverte du règne animal à travers des quiz ludiques et instructifs.",
    aiPrompt:
      "Génère des questions sur les animaux : espèces, comportements, habitats et records du règne animal.",
  },
  {
    slug: "nature",
    name: "Nature",
    icon: "🌱",
    group: "Nature & Animaux",
    heroImage: "/images/categories/nature-hero.webp",
    seoDescription:
      "Écosystèmes, phénomènes naturels et merveilles de notre planète : des quiz pour mieux comprendre et protéger le monde qui nous entoure.",
    aiPrompt:
      "Génère des questions sur la nature : écosystèmes, phénomènes naturels, climat et environnement.",
  },
  {
    slug: "langue-francaise",
    name: "Langue française",
    icon: "🔤",
    group: "Langues",
    heroImage: "/images/categories/langue-francaise-hero.webp",
    seoDescription:
      "Orthographe, grammaire, expressions et étymologie : mettez vos connaissances de la langue de Molière à l'épreuve.",
    aiPrompt:
      "Génère des questions sur la langue française : orthographe, grammaire, conjugaison, expressions et étymologie.",
  },
  {
    slug: "alimentation",
    name: "Alimentation",
    icon: "🍔",
    group: "Vie Quotidienne",
    heroImage: "/images/categories/alimentation-hero.webp",
    seoDescription:
      "Cuisine du monde, nutrition et anecdotes gourmandes : des quiz pour les curieux qui aiment autant manger qu'apprendre.",
    aiPrompt:
      "Génère des questions sur l'alimentation : cuisines du monde, nutrition, ingrédients et anecdotes culinaires.",
  },
  {
    slug: "code-de-la-route",
    name: "Code de la route",
    icon: "🚗",
    group: "Vie Quotidienne",
    heroImage: "/images/categories/code-de-la-route-hero.webp",
    seoDescription:
      "Panneaux, priorités et règles de circulation : révisez le code de la route avec des quiz pour futurs conducteurs et conducteurs confirmés.",
    aiPrompt:
      "Génère des questions de type examen du code de la route : panneaux, priorités, règles de circulation et sécurité routière.",
  },
  {
    slug: "drapeaux",
    name: "Drapeaux",
    icon: "🎌",
    group: "Vie Quotidienne",
    heroImage: "/images/categories/drapeaux-hero.webp",
    seoDescription:
      "Sauriez-vous reconnaître tous les drapeaux du monde ? Testez votre œil et votre mémoire avec ces quiz consacrés à la vexillologie.",
    aiPrompt:
      "Génère des questions permettant d'identifier des drapeaux de pays du monde entier et leur signification.",
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

export type CategoryGroupEntry = {
  group: CategoryGroup;
  categories: Category[];
};

// Ordered per CATEGORY_GROUPS rather than first-appearance in CATEGORIES, so
// the sidebar's group order stays stable regardless of how CATEGORIES is
// sorted/extended later.
export function getCategoriesGroupedByGroup(): CategoryGroupEntry[] {
  return CATEGORY_GROUPS.map((group) => ({
    group,
    categories: CATEGORIES.filter((category) => category.group === group),
  })).filter((entry) => entry.categories.length > 0);
}
