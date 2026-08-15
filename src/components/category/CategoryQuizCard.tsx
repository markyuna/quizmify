"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Category } from "@/lib/categories";
import type { CategoryTopicWithTrending } from "@/lib/categoryTopics";

// Same 3 difficulty keys/labels as QuizCreation's difficulty picker --
// reused via the "QuizCreation" namespace instead of a second translated
// copy of "Facile/Moyen/Difficile" living here.
const DIFFICULTY_KEYS: Record<string, string> = {
  easy: "difficultyEasy",
  medium: "difficultyMedium",
  hard: "difficultyHard",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  medium: "border-amber-400/50 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  hard: "border-rose-400/50 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
};

type CategoryQuizCardProps = {
  topic: CategoryTopicWithTrending;
  category: Category;
};

// Links straight into the existing quiz-creation screen with topic+category
// prefilled -- same idiom as TopicCarousel's suggestion cards. The visual is
// the category's own icon (no per-topic thumbnail/generation in this phase,
// see CategoryTopic's design note in prisma/schema.prisma).
export default function CategoryQuizCard({ topic, category }: CategoryQuizCardProps) {
  const t = useTranslations("CategoryQuizCard");
  const tDifficulty = useTranslations("QuizCreation");
  const locale = useLocale();

  return (
    <Link
      href={`/quiz?topic=${encodeURIComponent(topic.topicDisplay)}&category=${category.slug}`}
      className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/5"
    >
      <div className="relative flex h-24 w-full items-center justify-center overflow-hidden bg-slate-100 text-4xl transition duration-300 group-hover:scale-105 dark:bg-white/10">
        <span aria-hidden="true">{category.icon}</span>
        {topic.trending && (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-orange-500 shadow dark:bg-slate-900/90">
            <Flame className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{topic.topicDisplay}</h3>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-bold",
              DIFFICULTY_STYLES[topic.difficulty] ?? DIFFICULTY_STYLES.medium
            )}
          >
            {DIFFICULTY_KEYS[topic.difficulty] ? tDifficulty(DIFFICULTY_KEYS[topic.difficulty]) : topic.difficulty}
          </span>
        </div>

        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          {t("publishedOn", { date: topic.createdAt.toLocaleDateString(locale) })}
        </p>
      </div>
    </Link>
  );
}
