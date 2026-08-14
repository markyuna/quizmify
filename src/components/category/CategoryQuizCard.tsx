import Image from "next/image";
import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MockCategoryItem, QuizDifficulty } from "@/lib/mockCategoryQuizzes";

const DIFFICULTY_STYLES: Record<QuizDifficulty, string> = {
  Facile: "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  Moyen: "border-amber-400/50 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  Difficile: "border-rose-400/50 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
};

type CategoryQuizCardProps = {
  item: MockCategoryItem;
};

// Purely presentational for now -- this is mock content with no real quiz or
// test behind it, so the card isn't a link/button yet. Once generation is
// wired in, this is where the href/onClick lands.
export default function CategoryQuizCard({ item }: CategoryQuizCardProps) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/5">
      <div className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-white/10">
        <Image src={item.thumbnail} alt="" fill className="object-cover transition duration-300 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
        {item.trending && (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-orange-500 shadow dark:bg-slate-900/90">
            <Flame className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.kind === "quiz" && (
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", DIFFICULTY_STYLES[item.difficulty])}>
              {item.difficulty}
            </span>
          )}
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Publié le {new Date(item.publishedAt).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
  );
}
