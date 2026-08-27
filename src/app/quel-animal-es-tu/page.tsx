import { getTranslations } from "next-intl/server";

import PersonalityTestCard from "@/components/games/PersonalityTestCard";
import { getAuthSession } from "@/lib/nextauth";

// Metadata title stays static/English, matching every other page in the app
// (daily-challenge, puzzle-du-jour, statistics all do the same) -- only the
// on-page heading below is actually localized via next-intl.
export const metadata = {
  title: "What animal are you? | Quizmify",
};

export default async function QuelAnimalEsTuPage() {
  const session = await getAuthSession();
  const isAuthenticated = !!session?.user;
  const t = await getTranslations("PersonalityTests.quelAnimalEsTu");

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:py-8">
      <h1 className="mb-6 text-center text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
        {t("pageTitle")}
      </h1>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <PersonalityTestCard isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
