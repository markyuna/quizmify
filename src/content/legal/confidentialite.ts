import type { Locale } from "@/i18n/locales";
import type { LegalContent } from "@/components/LegalPage";

export const confidentialiteContent: Record<Locale, LegalContent> = {
  fr: {
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : 6 octobre 2026",
    sections: [
      {
        heading: "1. Responsable du traitement",
        paragraphs: [
          "Marcos Suarez Romero, entrepreneur individuel (SIRET 897 513 065 00010), 2 Rue Pierre Curie, 94270 Le Kremlin-Bicêtre, France — marcossuarezr88@gmail.com — est responsable du traitement des données personnelles collectées sur Quizmify au sens du Règlement Général sur la Protection des Données (RGPD).",
        ],
      },
      {
        heading: "2. Données collectées",
        paragraphs: [
          "Données de compte via Google OAuth : nom, adresse email, photo de profil",
          "Données de compte par email : nom, adresse email, mot de passe — le mot de passe n'est jamais stocké en clair, uniquement sous forme hachée (bcrypt), que Quizmify lui-même ne peut pas déchiffrer",
          "Données d'utilisation : thèmes de quiz, réponses, scores, points d'expérience (XP), niveau, historique des parties",
          "Données de paiement : identifiant client Stripe et identifiant de session de paiement — Quizmify ne stocke jamais vos coordonnées bancaires, qui sont traitées directement par Stripe",
        ],
      },
      {
        heading: "3. Finalités et bases légales",
        paragraphs: [
          "Fourniture du service (authentification, génération de quiz, suivi de progression) — exécution du contrat (art. 6.1.b RGPD)",
          "Traitement du paiement de l'offre Pro — exécution du contrat (art. 6.1.b RGPD)",
          "Sécurité et prévention des abus — intérêt légitime (art. 6.1.f RGPD)",
          "Affichage de l'activité récente de la communauté sur la page d'accueil (voir section 4) — intérêt légitime (art. 6.1.f RGPD) à faire vivre la communauté des joueurs ; vous pouvez vous y opposer à tout moment en désactivant l'option depuis la page Mon compte",
        ],
      },
      {
        heading: "4. Activité visible sur la page d'accueil",
        paragraphs: [
          "La page d'accueil, accessible à tous les visiteurs, affiche un fil des parties terminées récemment sur Quizmify (environ les 3 derniers jours). Pour chaque partie, seuls apparaissent votre prénom suivi de l'initiale de votre nom (par exemple « Marie D. »), le thème du quiz ou le nom du jeu, et le moment approximatif où elle a été jouée. Votre nom complet, votre adresse email et votre photo de profil n'y sont jamais affichés.",
          "Cette option est activée par défaut. Vous pouvez la désactiver à tout moment depuis la page Mon compte (« Apparaître dans l'activité de la communauté ») : vos parties cessent alors d'apparaître dans ce fil, au plus tard dans la minute qui suit.",
        ],
      },
      {
        heading: "5. Destinataires des données",
        paragraphs: [
          "Vos données peuvent être transmises aux sous-traitants suivants, dans la stricte mesure nécessaire au fonctionnement du service : Google (authentification OAuth), OpenAI (génération des questions de quiz à partir des thèmes saisis), Stripe (traitement des paiements), Supabase (hébergement de la base de données), Vercel (hébergement de l'application).",
          "Ces prestataires sont situés hors de l'Union européenne (États-Unis). Les transferts de données sont encadrés par des clauses contractuelles types ou un mécanisme de certification équivalent (Data Privacy Framework).",
        ],
      },
      {
        heading: "6. Cookies",
        paragraphs: [
          "Le Site utilise uniquement des cookies de session strictement nécessaires à l'authentification (gérés par NextAuth). Aucun cookie publicitaire ni traceur tiers n'est déposé.",
        ],
      },
      {
        heading: "7. Durée de conservation",
        paragraphs: [
          "Vos données sont conservées tant que votre compte est actif. Vous pouvez demander leur suppression à tout moment depuis la page Mon compte ou en écrivant à marcossuarezr88@gmail.com.",
        ],
      },
      {
        heading: "8. Vos droits",
        paragraphs: [
          "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition sur vos données. Vous pouvez exercer ces droits en écrivant à marcossuarezr88@gmail.com. Vous disposez également du droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) — www.cnil.fr.",
        ],
      },
      {
        heading: "9. Mineurs",
        paragraphs: [
          "Le Site n'est pas destiné aux personnes de moins de 15 ans sans l'autorisation d'un titulaire de l'autorité parentale.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: October 6, 2026",
    sections: [
      {
        heading: "1. Data controller",
        paragraphs: [
          "Marcos Suarez Romero, sole trader (SIRET 897 513 065 00010), 2 Rue Pierre Curie, 94270 Le Kremlin-Bicêtre, France — marcossuarezr88@gmail.com — is the controller of personal data collected on Quizmify under the General Data Protection Regulation (GDPR).",
        ],
      },
      {
        heading: "2. Data collected",
        paragraphs: [
          "Account data via Google OAuth: name, email address, profile picture",
          "Account data via email sign-up: name, email address, password — the password is never stored in plain text, only as a bcrypt hash that Quizmify itself cannot reverse",
          "Usage data: quiz topics, answers, scores, experience points (XP), level, game history",
          "Payment data: Stripe customer ID and checkout session ID — Quizmify never stores your card details, which are processed directly by Stripe",
        ],
      },
      {
        heading: "3. Purposes and legal bases",
        paragraphs: [
          "Providing the service (authentication, quiz generation, progress tracking) — performance of a contract (GDPR art. 6.1.b)",
          "Processing payment for the Pro plan — performance of a contract (GDPR art. 6.1.b)",
          "Security and abuse prevention — legitimate interest (GDPR art. 6.1.f)",
          "Showing recent community activity on the homepage (see section 4) — legitimate interest (GDPR art. 6.1.f) in keeping the player community lively; you can object at any time by turning the option off from the My Account page",
        ],
      },
      {
        heading: "4. Activity shown on the homepage",
        paragraphs: [
          "The homepage, which any visitor can see, shows a feed of games recently finished on Quizmify (roughly the last 3 days). For each game, only your first name followed by your last initial (for example “Marie D.”), the quiz topic or game name, and approximately when it was played are shown. Your full name, email address and profile picture are never displayed there.",
          "This option is on by default. You can turn it off at any time from the My Account page (“Show me in the community activity”): your games then stop appearing in the feed within a minute at most.",
        ],
      },
      {
        heading: "5. Data recipients",
        paragraphs: [
          "Your data may be shared with the following processors, strictly as needed to run the service: Google (OAuth authentication), OpenAI (quiz question generation from submitted topics), Stripe (payment processing), Supabase (database hosting), Vercel (application hosting).",
          "These providers are located outside the European Union (United States). Data transfers are governed by Standard Contractual Clauses or an equivalent certification mechanism (Data Privacy Framework).",
        ],
      },
      {
        heading: "6. Cookies",
        paragraphs: [
          "The Site only uses session cookies strictly necessary for authentication (managed by NextAuth). No advertising cookies or third-party trackers are used.",
        ],
      },
      {
        heading: "7. Retention period",
        paragraphs: [
          "Your data is kept as long as your account is active. You can request its deletion at any time from the My Account page or by writing to marcossuarezr88@gmail.com.",
        ],
      },
      {
        heading: "8. Your rights",
        paragraphs: [
          "Under the GDPR, you have the right to access, rectify, erase, restrict, port, and object to the processing of your data. You can exercise these rights by writing to marcossuarezr88@gmail.com. You also have the right to lodge a complaint with the French data protection authority (CNIL) — www.cnil.fr.",
        ],
      },
      {
        heading: "9. Minors",
        paragraphs: [
          "The Site is not intended for individuals under 15 years old without the authorization of a parent or legal guardian.",
        ],
      },
    ],
  },
  es: {
    title: "Política de privacidad",
    updated: "Última actualización: 6 de octubre de 2026",
    sections: [
      {
        heading: "1. Responsable del tratamiento",
        paragraphs: [
          "Marcos Suarez Romero, autónomo (SIRET 897 513 065 00010), 2 Rue Pierre Curie, 94270 Le Kremlin-Bicêtre, Francia — marcossuarezr88@gmail.com — es responsable del tratamiento de los datos personales recopilados en Quizmify conforme al Reglamento General de Protección de Datos (RGPD).",
        ],
      },
      {
        heading: "2. Datos recopilados",
        paragraphs: [
          "Datos de cuenta vía Google OAuth: nombre, dirección de email, foto de perfil",
          "Datos de cuenta por email: nombre, dirección de email, contraseña — la contraseña nunca se guarda en texto plano, solo como un hash bcrypt que ni siquiera Quizmify puede revertir",
          "Datos de uso: temas de quiz, respuestas, puntajes, puntos de experiencia (XP), nivel, historial de partidas",
          "Datos de pago: ID de cliente de Stripe e ID de sesión de pago — Quizmify nunca almacena tus datos bancarios, que son procesados directamente por Stripe",
        ],
      },
      {
        heading: "3. Finalidades y bases legales",
        paragraphs: [
          "Prestación del servicio (autenticación, generación de quiz, seguimiento de progreso) — ejecución del contrato (art. 6.1.b RGPD)",
          "Procesamiento del pago de la oferta Pro — ejecución del contrato (art. 6.1.b RGPD)",
          "Seguridad y prevención de abusos — interés legítimo (art. 6.1.f RGPD)",
          "Visualización de la actividad reciente de la comunidad en la página de inicio (ver sección 4) — interés legítimo (art. 6.1.f RGPD) en dar vida a la comunidad de jugadores; podés oponerte en cualquier momento desactivando la opción desde la página Mi cuenta",
        ],
      },
      {
        heading: "4. Actividad visible en la página de inicio",
        paragraphs: [
          "La página de inicio, accesible a cualquier visitante, muestra un listado de las partidas terminadas recientemente en Quizmify (aproximadamente los últimos 3 días). De cada partida solo aparecen tu nombre seguido de la inicial de tu apellido (por ejemplo «Marie D.»), el tema del quiz o el nombre del juego, y el momento aproximado en que se jugó. Tu nombre completo, tu dirección de email y tu foto de perfil nunca se muestran ahí.",
          "Esta opción está activada por defecto. Podés desactivarla en cualquier momento desde la página Mi cuenta («Aparecer en la actividad de la comunidad»): tus partidas dejan de aparecer en ese listado en un minuto como máximo.",
        ],
      },
      {
        heading: "5. Destinatarios de los datos",
        paragraphs: [
          "Tus datos pueden compartirse con los siguientes proveedores, en la estricta medida necesaria para el funcionamiento del servicio: Google (autenticación OAuth), OpenAI (generación de preguntas a partir de los temas ingresados), Stripe (procesamiento de pagos), Supabase (alojamiento de la base de datos), Vercel (alojamiento de la aplicación).",
          "Estos proveedores están ubicados fuera de la Unión Europea (Estados Unidos). Las transferencias de datos están reguladas por Cláusulas Contractuales Tipo o un mecanismo de certificación equivalente (Data Privacy Framework).",
        ],
      },
      {
        heading: "6. Cookies",
        paragraphs: [
          "El Sitio solo utiliza cookies de sesión estrictamente necesarias para la autenticación (gestionadas por NextAuth). No se utilizan cookies publicitarias ni rastreadores de terceros.",
        ],
      },
      {
        heading: "7. Período de conservación",
        paragraphs: [
          "Tus datos se conservan mientras tu cuenta esté activa. Podés solicitar su eliminación en cualquier momento desde la página Mi cuenta o escribiendo a marcossuarezr88@gmail.com.",
        ],
      },
      {
        heading: "8. Tus derechos",
        paragraphs: [
          "Conforme al RGPD, tenés derecho de acceso, rectificación, supresión, limitación, portabilidad y oposición sobre tus datos. Podés ejercer estos derechos escribiendo a marcossuarezr88@gmail.com. También tenés derecho a presentar una reclamación ante la autoridad francesa de protección de datos (CNIL) — www.cnil.fr.",
        ],
      },
      {
        heading: "9. Menores",
        paragraphs: [
          "El Sitio no está destinado a personas menores de 15 años sin la autorización de un titular de la patria potestad.",
        ],
      },
    ],
  },
};
