import Link from "next/link";
import Image from "next/image";
import { PawPrint, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getCategoryBySlug } from "@/lib/categories";
import { getOrGenerateCategoryRecommendation } from "@/lib/categoryRecommendations";
import { QUEL_ANIMAL_ES_TU_IMAGES, isAnimalKey } from "@/lib/personalityTests/quelAnimalEsTu.config";

/**
 * Dashboard entry point for the personality-mascot feature (Fases 1-3):
 * shows the confirmed animal + top-3 category recommendations from the
 * dynamic engine (categoryRecommendations.ts), or an empty-state CTA into
 * the test itself when there's no animal yet. Self-contained data fetching
 * (only takes userId), same pattern as RecommendationCard/TrophyCabinetCard.
 */
export default async function PersonalityMascotCard({ userId }: { userId: string }) {
  const t = await getTranslations("PersonalityMascot");
  const tAnimals = await getTranslations("PersonalityTests.quelAnimalEsTu");
  const tCategories = await getTranslations("Categories");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { personalityAnimal: true },
  });

  const animal = user?.personalityAnimal;

  if (!animal || !isAnimalKey(animal)) {
    return (
      <Card className="group relative h-full overflow-hidden rounded-[1.75rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.01] dark:bg-white/5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-rose-500/10" />
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-pink-500/15 blur-3xl" />

        <CardContent className="relative z-10 flex h-full flex-col p-4 sm:p-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5 sm:text-xs">
            <PawPrint className="h-3.5 w-3.5 text-pink-400" />
            {t("badge")}
          </div>

          <div className="mt-3 flex flex-1 flex-col items-start gap-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("emptyTitle")}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              {t("emptyDescription")}
            </p>
          </div>

          <Link
            href="/games?game=personality-test"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-opacity hover:opacity-90"
          >
            {t("ctaLabel")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  const recommendation = await getOrGenerateCategoryRecommendation(userId);
  const recommendedSlugs = recommendation?.recommendedSlugs ?? [];
  const animalImage = QUEL_ANIMAL_ES_TU_IMAGES[animal];

  return (
    <Card className="group relative h-full overflow-hidden rounded-[1.75rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.01] dark:bg-white/5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-rose-500/10" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-pink-500/15 blur-3xl" />

      <CardContent className="relative z-10 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-md dark:border-white/20">
            <Image
              src={animalImage}
              alt={tAnimals(`animals.${animal}.name`)}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">{t("mascotLabel")}</p>
            <p className="truncate text-base font-bold text-slate-900 dark:text-white">
              {tAnimals(`animals.${animal}.name`)}
            </p>
          </div>
        </div>

        {recommendedSlugs.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("recommendationsTitle")}
            </p>
            <div className="flex flex-col gap-1.5">
              {recommendedSlugs.map((slug) => {
                const category = getCategoryBySlug(slug);
                return (
                  <Link
                    key={slug}
                    href={`/quiz/categoria/${slug}`}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/60 px-3 py-2 text-sm font-medium text-slate-700 backdrop-blur-xl transition-colors hover:border-pink-300 hover:bg-pink-50 dark:bg-white/5 dark:text-slate-200 dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10"
                  >
                    <span>{category?.icon}</span>
                    <span className="truncate">{tCategories(`${slug}.name`)}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
