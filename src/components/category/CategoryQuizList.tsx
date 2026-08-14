"use client";

import * as React from "react";
import { Search, ArrowDownWideNarrow, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { MockCategoryItem } from "@/lib/mockCategoryQuizzes";
import CategoryQuizCard from "./CategoryQuizCard";

type CategoryQuizListProps = {
  categoryName: string;
  items: MockCategoryItem[];
};

// The sort button is UI-only for now (spec: "puede ser solo UI ... sin
// lógica de orden real") -- it toggles a visual pressed state but the list
// order never actually changes yet.
export default function CategoryQuizList({ categoryName, items }: CategoryQuizListProps) {
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [sortPressed, setSortPressed] = React.useState(false);

  const filteredItems = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.tags.some((tag) => tag.toLowerCase().includes(normalized))
    );
  }, [items, query]);

  function handleCreateCustomQuiz() {
    toast({
      title: "Bientôt disponible",
      description: `La génération d'un quiz personnalisé sur « ${categoryName} » arrive prochainement.`,
    });
  }

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
          variant={sortPressed ? "secondary" : "outline"}
          onClick={() => setSortPressed((prev) => !prev)}
          className="shrink-0"
        >
          <ArrowDownWideNarrow className="h-4 w-4" />
          Date de publication
        </Button>
      </div>

      {filteredItems.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <CategoryQuizCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Aucun résultat pour « {query} ».
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-dashed border-violet-300 bg-violet-50/60 p-5 text-center dark:border-violet-500/30 dark:bg-violet-500/10">
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          Vous ne trouvez pas ce que vous cherchez ?
        </p>
        <Button type="button" onClick={handleCreateCustomQuiz}>
          <Sparkles className="h-4 w-4" />
          Créer un quiz personnalisé sur ce thème
        </Button>
      </div>
    </div>
  );
}
