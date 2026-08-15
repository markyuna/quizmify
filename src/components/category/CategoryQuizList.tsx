"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ArrowDownWideNarrow, Flame, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/categories";
import type { CategoryTopicWithTrending } from "@/lib/categoryTopics";
import CategoryQuizCard from "./CategoryQuizCard";

type CategoryQuizListProps = {
  category: Category;
  items: CategoryTopicWithTrending[];
};

export default function CategoryQuizList({ category, items }: CategoryQuizListProps) {
  const [query, setQuery] = React.useState("");
  const [sortByTrending, setSortByTrending] = React.useState(false);

  const filteredItems = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const base = normalized
      ? items.filter((item) => item.topicDisplay.toLowerCase().includes(normalized))
      : items;

    if (!sortByTrending) return base;

    // Mirrors getCategoryTopics(sort: "trending") in src/lib/categoryTopics.ts
    // -- resorting the already-fetched list client-side avoids a second
    // server round-trip just to flip the toggle.
    return [...base].sort((a, b) => {
      if (a.trending !== b.trending) return a.trending ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [items, query, sortByTrending]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrer par mot-clé"
            className="pl-11"
          />
        </div>

        <Button
          type="button"
          variant={sortByTrending ? "secondary" : "outline"}
          onClick={() => setSortByTrending((prev) => !prev)}
          className="shrink-0"
        >
          {sortByTrending ? <Flame className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
          {sortByTrending ? "Tendances" : "Date de publication"}
        </Button>
      </div>

      {filteredItems.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <CategoryQuizCard key={item.id} topic={item} category={category} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Aucun quiz communautaire pour cette catégorie pour le moment. Soyez le premier à en créer un !
        </p>
      ) : (
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Aucun résultat pour « {query} ».
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-dashed border-violet-300 bg-violet-50/60 p-5 text-center dark:border-violet-500/30 dark:bg-violet-500/10">
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          Vous ne trouvez pas ce que vous cherchez ?
        </p>
        <Button asChild>
          <Link href={`/quiz?category=${category.slug}`}>
            <Sparkles className="h-4 w-4" />
            Créer un quiz personnalisé sur ce thème
          </Link>
        </Button>
      </div>
    </div>
  );
}
