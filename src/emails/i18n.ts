import type { Locale } from "@/i18n/locales";
import type { WinbackStage } from "@/lib/notifications";

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
      /** Subject when at least one friend already played (name may be null if none has a usable public name). */
      friendsSubject: (topFriendName: string | null, friendsCount: number) => string;
      friendsLine: (topFriendName: string | null, correct: number, total: number, otherFriends: number) => string;
      playersLine: (count: number) => string;
    };
    winback: {
      subject: Record<WinbackStage, string>;
      preview: string;
      heading: (daysInactive: number) => string;
      body: string;
      level: string;
      neurons: string;
      bestStreak: string;
      days: (n: number) => string;
      challengeLine: (topic: string) => string;
      cta: string;
    };
    neuronsReminder: {
      subject: (balance: number) => string;
      preview: string;
      body: (cost: number) => string;
      progress: (remaining: number, reward: number) => string;
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
      friendsSubject: (name, count) =>
        name
          ? `${name} already played today's Daily Challenge`
          : count === 1
            ? "A friend of yours already played today's Daily Challenge"
            : `${count} of your friends already played today's Daily Challenge`,
      friendsLine: (name, correct, total, others) =>
        name
          ? `${name} scored ${correct}/${total}${
              others > 0 ? ` and ${others} other ${others === 1 ? "friend" : "friends"} already played` : ""
            }. Can you beat that?`
          : others === 1
            ? "A friend of yours already played it. Your turn!"
            : `${others} of your friends already played it. Your turn!`,
      playersLine: (count) => `${count} players have already taken it today.`,
    },
    winback: {
      subject: {
        d7: "It's been a week -- your next quiz is waiting",
        d21: "We miss you at Quizmify",
      },
      preview: "Your progress is right where you left it.",
      heading: (days) => `It's been ${days} days since your last visit`,
      body: "Your level, your Neurons and your best streak are all still here. A quick quiz is the easiest way to pick up where you left off.",
      level: "Level",
      neurons: "Neurons",
      bestStreak: "Best streak",
      days: (n) => `${n} ${n === 1 ? "day" : "days"}`,
      challengeLine: (topic) => `Today's Daily Challenge: "${topic}".`,
      cta: "Play a quiz",
    },
    neuronsReminder: {
      subject: (balance) =>
        balance === 0 ? "You're out of Neurons" : `You have ${balance} ${balance === 1 ? "Neuron" : "Neurons"} left`,
      preview: "Play a quiz to earn more.",
      body: (cost) => `Each Neuron game costs ${cost} Neurons per play.`,
      progress: (remaining, reward) =>
        `You're ${remaining} correct ${remaining === 1 ? "answer" : "answers"} away from +${reward} Neurons -- every 10 correct answers in a medium or hard quiz earns ${reward}.`,
      cta: "Play a quiz to earn Neurons",
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
      friendsSubject: (name, count) =>
        name
          ? `${name} ya jugó el Desafío Diario de hoy`
          : count === 1
            ? "Un amigo tuyo ya jugó el Desafío Diario de hoy"
            : `${count} de tus amigos ya jugaron el Desafío Diario de hoy`,
      friendsLine: (name, correct, total, others) =>
        name
          ? `${name} sacó ${correct}/${total}${
              others > 0
                ? others === 1
                  ? " y 1 amigo más ya lo jugó"
                  : ` y ${others} amigos más ya lo jugaron`
                : ""
            }. ¿Lo superás?`
          : others === 1
            ? "Un amigo tuyo ya lo jugó. ¡Te toca!"
            : `${others} de tus amigos ya lo jugaron. ¡Te toca!`,
      playersLine: (count) => `Ya lo jugaron ${count} personas hoy.`,
    },
    winback: {
      subject: {
        d7: "Pasó una semana: tu próximo quiz te espera",
        d21: "Te extrañamos en Quizmify",
      },
      preview: "Tu progreso sigue donde lo dejaste.",
      heading: (days) => `Pasaron ${days} días desde tu última visita`,
      body: "Tu nivel, tus Neuronas y tu mejor racha siguen acá. Un quiz rápido es la forma más fácil de retomar donde lo dejaste.",
      level: "Nivel",
      neurons: "Neuronas",
      bestStreak: "Mejor racha",
      days: (n) => `${n} ${n === 1 ? "día" : "días"}`,
      challengeLine: (topic) => `Desafío Diario de hoy: "${topic}".`,
      cta: "Jugar un quiz",
    },
    neuronsReminder: {
      subject: (balance) =>
        balance === 0
          ? "Te quedaste sin Neuronas"
          : balance === 1
            ? "Te queda 1 Neurona"
            : `Te quedan ${balance} Neuronas`,
      preview: "Jugá un quiz para ganar más.",
      body: (cost) => `Cada partida de un juego con Neuronas cuesta ${cost} Neuronas.`,
      progress: (remaining, reward) =>
        `${
          remaining === 1 ? "Te falta 1 respuesta correcta" : `Te faltan ${remaining} respuestas correctas`
        } para ganar +${reward} Neuronas: cada 10 respuestas correctas en un quiz de dificultad media o difícil suman ${reward}.`,
      cta: "Jugar un quiz y ganar Neuronas",
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
      friendsSubject: (name, count) =>
        name
          ? `${name} a déjà joué au défi du jour`
          : count === 1
            ? "Un de vos amis a déjà joué au défi du jour"
            : `${count} de vos amis ont déjà joué au défi du jour`,
      friendsLine: (name, correct, total, others) =>
        name
          ? `${name} a obtenu ${correct}/${total}${
              others > 0
                ? others === 1
                  ? " et 1 autre ami a déjà joué"
                  : ` et ${others} autres amis ont déjà joué`
                : ""
            }. Saurez-vous faire mieux ?`
          : others === 1
            ? "Un de vos amis y a déjà joué. À vous !"
            : `${others} de vos amis y ont déjà joué. À vous !`,
      playersLine: (count) => `${count} joueurs l'ont déjà relevé aujourd'hui.`,
    },
    winback: {
      subject: {
        d7: "Une semaine déjà : votre prochain quiz vous attend",
        d21: "Vous nous manquez sur Quizmify",
      },
      preview: "Votre progression est là où vous l'avez laissée.",
      heading: (days) => `Cela fait ${days} jours depuis votre dernière visite`,
      body: "Votre niveau, vos Neurones et votre meilleure série sont toujours là. Un quiz rapide est le moyen le plus simple de reprendre là où vous en étiez.",
      level: "Niveau",
      neurons: "Neurones",
      bestStreak: "Meilleure série",
      days: (n) => `${n} ${n === 1 ? "jour" : "jours"}`,
      challengeLine: (topic) => `Défi du jour : « ${topic} ».`,
      cta: "Jouer à un quiz",
    },
    neuronsReminder: {
      subject: (balance) =>
        balance === 0
          ? "Vous n'avez plus de Neurones"
          : `Il vous reste ${balance} ${balance === 1 ? "Neurone" : "Neurones"}`,
      preview: "Jouez à un quiz pour en gagner plus.",
      body: (cost) => `Chaque partie d'un jeu à Neurones coûte ${cost} Neurones.`,
      progress: (remaining, reward) =>
        `${
          remaining === 1 ? "Plus qu'une bonne réponse" : `Plus que ${remaining} bonnes réponses`
        } pour gagner +${reward} Neurones : chaque série de 10 bonnes réponses dans un quiz moyen ou difficile en rapporte ${reward}.`,
      cta: "Jouer à un quiz pour gagner des Neurones",
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
