import type { Locale } from "@/i18n/locales";
import type { LegalContent } from "@/components/LegalPage";

export const mentionsLegalesContent: Record<Locale, LegalContent> = {
  fr: {
    title: "Mentions légales",
    updated: "Dernière mise à jour : 10 juillet 2026",
    sections: [
      {
        heading: "Éditeur du site",
        paragraphs: [
          "Le site Quizmify (le « Site ») est édité par :\nMarcos Suarez Romero, entrepreneur individuel (auto-entrepreneur)\nSIREN : 897 513 065\nSIRET : 897 513 065 00010\nAdresse : 2 Rue Pierre Curie, 94270 Le Kremlin-Bicêtre, France\nContact : marcossuarezr88@gmail.com\nDirecteur de la publication : Marcos Suarez Romero",
        ],
      },
      {
        heading: "Hébergement",
        paragraphs: [
          "Le Site est hébergé par :\nVercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis\nhttps://vercel.com",
          "Les données sont stockées par :\nSupabase Inc. (infrastructure PostgreSQL) — https://supabase.com",
        ],
      },
      {
        heading: "Propriété intellectuelle",
        paragraphs: [
          "L'ensemble des éléments du Site (structure, textes, logos, mise en page) est protégé par le droit de la propriété intellectuelle. Les questions de quiz sont générées automatiquement par un modèle d'intelligence artificielle (OpenAI) à partir des thèmes saisis par les utilisateurs et peuvent contenir des inexactitudes.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "Pour toute question relative au Site, à son contenu, ou à vos données personnelles, vous pouvez écrire à marcossuarezr88@gmail.com.",
        ],
      },
    ],
  },
  en: {
    title: "Legal Notice",
    updated: "Last updated: July 10, 2026",
    sections: [
      {
        heading: "Site publisher",
        paragraphs: [
          "The Quizmify website (the \"Site\") is published by:\nMarcos Suarez Romero, sole trader (auto-entrepreneur, France)\nSIREN: 897 513 065\nSIRET: 897 513 065 00010\nAddress: 2 Rue Pierre Curie, 94270 Le Kremlin-Bicêtre, France\nContact: marcossuarezr88@gmail.com\nPublication director: Marcos Suarez Romero",
        ],
      },
      {
        heading: "Hosting",
        paragraphs: [
          "The Site is hosted by:\nVercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, USA\nhttps://vercel.com",
          "Data is stored by:\nSupabase Inc. (PostgreSQL infrastructure) — https://supabase.com",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "All elements of the Site (structure, text, logos, layout) are protected by intellectual property law. Quiz questions are generated automatically by an AI model (OpenAI) based on topics entered by users and may contain inaccuracies.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "For any question regarding the Site, its content, or your personal data, you can write to marcossuarezr88@gmail.com.",
        ],
      },
    ],
  },
  es: {
    title: "Aviso legal",
    updated: "Última actualización: 10 de julio de 2026",
    sections: [
      {
        heading: "Editor del sitio",
        paragraphs: [
          "El sitio Quizmify (el «Sitio») está editado por:\nMarcos Suarez Romero, autónomo (auto-entrepreneur, Francia)\nSIREN: 897 513 065\nSIRET: 897 513 065 00010\nDirección: 2 Rue Pierre Curie, 94270 Le Kremlin-Bicêtre, Francia\nContacto: marcossuarezr88@gmail.com\nDirector de publicación: Marcos Suarez Romero",
        ],
      },
      {
        heading: "Alojamiento",
        paragraphs: [
          "El Sitio está alojado por:\nVercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, EE. UU.\nhttps://vercel.com",
          "Los datos se almacenan en:\nSupabase Inc. (infraestructura PostgreSQL) — https://supabase.com",
        ],
      },
      {
        heading: "Propiedad intelectual",
        paragraphs: [
          "Todos los elementos del Sitio (estructura, textos, logos, diseño) están protegidos por el derecho de propiedad intelectual. Las preguntas del quiz se generan automáticamente mediante un modelo de inteligencia artificial (OpenAI) a partir de los temas ingresados por los usuarios y pueden contener imprecisiones.",
        ],
      },
      {
        heading: "Contacto",
        paragraphs: [
          "Para cualquier consulta relacionada con el Sitio, su contenido o tus datos personales, podés escribir a marcossuarezr88@gmail.com.",
        ],
      },
    ],
  },
};
