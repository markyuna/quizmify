import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Quizmify | AI Quiz Generator",
  description: "Learn about Quizmify, an AI-powered platform that generates personalized quizzes and tracks your learning progress.",
};

export default async function AboutPage() {
  const t = await getTranslations("About");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <section className="px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          {/* Title */}
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl dark:text-white">
            {t("title")}
          </h1>

          {/* Intro */}
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
            {t("intro")}
          </p>

          {/* English description (for verification purposes) */}
          <div className="mt-10 rounded-lg border border-slate-200/60 bg-white/60 p-6 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <p className="text-base leading-7 text-slate-700 dark:text-slate-300">
              {t("descriptionEnglish")}
            </p>
          </div>

          {/* Spanish description */}
          <div className="mt-6 rounded-lg border border-slate-200/60 bg-white/60 p-6 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <p className="text-base leading-7 text-slate-700 dark:text-slate-300">
              {t("descriptionSpanish")}
            </p>
          </div>

          {/* Data usage section */}
          <div className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t("dataUsageTitle")}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              {t("dataUsageDesc")}
            </p>
            <ul className="mt-4 space-y-3 text-base text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-violet-500 dark:bg-violet-400" />
                <span>{t("dataPoint1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-violet-500 dark:bg-violet-400" />
                <span>{t("dataPoint2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-violet-500 dark:bg-violet-400" />
                <span>{t("dataPoint3")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-violet-500 dark:bg-violet-400" />
                <span>{t("dataPoint4")}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
