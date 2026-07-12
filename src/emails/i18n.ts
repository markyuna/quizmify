import type { Locale } from "@/i18n/locales";

/**
 * Standalone string dictionary for transactional emails. Cron-triggered
 * sends have no request context (no cookies/headers), so next-intl's
 * request-scoped machinery isn't available here -- this is intentionally a
 * small, separate table rather than reusing messages/*.json.
 */
export const emailStrings: Record<
  Locale,
  {
    footerLink: string;
    streakReminder: {
      subject: (streak: number) => string;
      preview: string;
      heading: (streak: number) => string;
      body: string;
      cta: string;
    };
    dailyChallengeReminder: {
      subject: string;
      preview: string;
      heading: string;
      body: (topic: string) => string;
      cta: string;
    };
    weeklySummary: {
      subject: string;
      preview: string;
      heading: string;
      intro: string;
      quizzesPlayed: string;
      currentStreak: string;
      longestStreakThisMonth: string;
      accuracyByTopic: string;
      noTopicData: string;
      improvedBy: (points: number) => string;
      droppedBy: (points: number) => string;
      cta: string;
    };
    premiumEndingSoon: {
      subject: string;
      preview: string;
      heading: string;
      body: string;
      cta: string;
    };
  }
> = {
  en: {
    footerLink: "Manage notification preferences",
    streakReminder: {
      subject: (streak) => `Don't lose your ${streak}-day streak!`,
      preview: "A quick quiz keeps it alive.",
      heading: (streak) => `Your ${streak}-day streak is about to end`,
      body: "You haven't played today yet. One quick quiz is all it takes to keep your streak alive.",
      cta: "Play now",
    },
    dailyChallengeReminder: {
      subject: "Today's Daily Challenge is waiting",
      preview: "See how you stack up against everyone else.",
      heading: "You haven't played today's Daily Challenge yet",
      body: (topic) => `Today's topic is "${topic}" -- everyone gets the same questions, so it's a fair shot at the top of the board.`,
      cta: "Play the Daily Challenge",
    },
    weeklySummary: {
      subject: "Your Quizmify week in review",
      preview: "See how you did this week.",
      heading: "Your week in review",
      intro: "Here's how your last 7 days went:",
      quizzesPlayed: "Quizzes played",
      currentStreak: "Current streak",
      longestStreakThisMonth: "Longest streak this month",
      accuracyByTopic: "Accuracy by topic",
      noTopicData: "Play a few more quizzes to see topic-by-topic trends here.",
      improvedBy: (points) => `+${points} pts vs last week`,
      droppedBy: (points) => `-${points} pts vs last week`,
      cta: "Play a quiz",
    },
    premiumEndingSoon: {
      subject: "Your Pro access ends tomorrow",
      preview: "Keep your unlimited progress going.",
      heading: "Your Pro access ends tomorrow",
      body: "Your free Pro period is about to end. Upgrade now to keep unlimited level progression, PDF exports, and streak protection.",
      cta: "Upgrade to Pro",
    },
  },
  es: {
    footerLink: "Gestionar preferencias de notificaciones",
    streakReminder: {
      subject: (streak) => `¡No pierdas tu racha de ${streak} días!`,
      preview: "Un quiz rápido y la mantenés viva.",
      heading: (streak) => `Tu racha de ${streak} días está por terminar`,
      body: "Todavía no jugaste hoy. Con un quiz rápido alcanza para mantener tu racha.",
      cta: "Jugar ahora",
    },
    dailyChallengeReminder: {
      subject: "El Desafío Diario de hoy te espera",
      preview: "Mirá cómo te comparás con el resto.",
      heading: "Todavía no jugaste el Desafío Diario de hoy",
      body: (topic) => `El tema de hoy es "${topic}" -- todos reciben las mismas preguntas, así que es una oportunidad justa de llegar arriba de la tabla.`,
      cta: "Jugar el Desafío Diario",
    },
    weeklySummary: {
      subject: "Tu semana en Quizmify",
      preview: "Mirá cómo te fue esta semana.",
      heading: "Tu semana en resumen",
      intro: "Así te fue en los últimos 7 días:",
      quizzesPlayed: "Quizzes jugados",
      currentStreak: "Racha actual",
      longestStreakThisMonth: "Racha más larga del mes",
      accuracyByTopic: "Precisión por tema",
      noTopicData: "Jugá algunos quizzes más para ver tendencias por tema acá.",
      improvedBy: (points) => `+${points} pts vs. la semana pasada`,
      droppedBy: (points) => `-${points} pts vs. la semana pasada`,
      cta: "Jugar un quiz",
    },
    premiumEndingSoon: {
      subject: "Tu acceso Pro termina mañana",
      preview: "No pierdas tu progreso ilimitado.",
      heading: "Tu acceso Pro termina mañana",
      body: "Tu período Pro gratuito está por terminar. Actualizá ahora para mantener la progresión de nivel ilimitada, exportación a PDF y protección de racha.",
      cta: "Actualizar a Pro",
    },
  },
  fr: {
    footerLink: "Gérer les préférences de notification",
    streakReminder: {
      subject: (streak) => `Ne perdez pas votre série de ${streak} jours !`,
      preview: "Un quiz rapide suffit pour la maintenir.",
      heading: (streak) => `Votre série de ${streak} jours touche à sa fin`,
      body: "Vous n'avez pas encore joué aujourd'hui. Un quiz rapide suffit pour garder votre série.",
      cta: "Jouer maintenant",
    },
    dailyChallengeReminder: {
      subject: "Le défi du jour vous attend",
      preview: "Voyez comment vous vous comparez aux autres.",
      heading: "Vous n'avez pas encore joué au défi du jour",
      body: (topic) => `Le thème du jour est « ${topic} » -- tout le monde reçoit les mêmes questions, c'est donc une chance équitable d'atteindre le sommet du classement.`,
      cta: "Jouer au défi du jour",
    },
    weeklySummary: {
      subject: "Votre semaine sur Quizmify",
      preview: "Voici comment s'est passée votre semaine.",
      heading: "Votre semaine en résumé",
      intro: "Voici vos 7 derniers jours :",
      quizzesPlayed: "Quiz joués",
      currentStreak: "Série actuelle",
      longestStreakThisMonth: "Plus longue série du mois",
      accuracyByTopic: "Précision par thème",
      noTopicData: "Jouez encore quelques quiz pour voir les tendances par thème ici.",
      improvedBy: (points) => `+${points} pts vs la semaine dernière`,
      droppedBy: (points) => `-${points} pts vs la semaine dernière`,
      cta: "Jouer à un quiz",
    },
    premiumEndingSoon: {
      subject: "Votre accès Pro se termine demain",
      preview: "Gardez votre progression illimitée.",
      heading: "Votre accès Pro se termine demain",
      body: "Votre période Pro gratuite touche à sa fin. Passez à Pro maintenant pour garder la progression de niveau illimitée, l'export PDF et la protection de série.",
      cta: "Passer à Pro",
    },
  },
};
