"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryTopicLookupResponse } from "@/app/api/category-topics/lookup/route";

// Standalone, not a shared hook with QuizSearchHero.tsx -- see the plan
// discussion: the mascot/typeahead/animation machinery there is delicate
// and already shipped on the home + /games, and the actual resolution
// logic this needs (lookup -> redirect, or fall back to AI creation) is
// small enough that duplicating it here is lower risk than refactoring
// that component. Same 2 endpoints, same redirect shapes, same 2-step
// not-found-then-confirm flow -- just no debounce, no suggestions
// dropdown, no motion.
export default function CompactCategorySearch() {
  const t = useTranslations("CategoriesPage");
  const tGuestGames = useTranslations("GuestGames");
  const router = useRouter();
  const locale = useLocale();

  const [searchTopic, setSearchTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFoundTopic, setNotFoundTopic] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const topic = searchTopic.trim();

    if (!topic) {
      setError(tGuestGames("guestSearchEmptyTopic"));
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotFoundTopic(null);

    try {
      const response = await fetch(
        `/api/category-topics/lookup?topic=${encodeURIComponent(topic)}&locale=${locale}`
      );
      const data: CategoryTopicLookupResponse = await response.json();

      if (data.exists && data.categorySlug) {
        router.push(`/quiz?topic=${encodeURIComponent(topic)}&category=${data.categorySlug}`);
        return;
      }

      setNotFoundTopic(topic);
    } catch (err) {
      console.error("Category search error:", err);
      setError(t("searchFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWithAi = () => {
    const topic = (notFoundTopic ?? searchTopic).trim();
    if (!topic) return;
    router.push(`/quiz?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t("searchHeading")}
      </h2>
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchTopic}
            onChange={(e) => {
              setSearchTopic(e.target.value);
              setError(null);
              setNotFoundTopic(null);
            }}
            disabled={isLoading}
            className="h-10 pl-9"
          />
        </div>
        <Button type="submit" size="sm" disabled={isLoading || !searchTopic.trim()} className="h-10 px-3">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p>}

      {!error && notFoundTopic && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-slate-700 dark:border-violet-800 dark:bg-violet-500/10 dark:text-slate-200">
          <p>{tGuestGames("topicNotFound", { topic: notFoundTopic })}</p>
          <Button type="button" size="sm" onClick={handleCreateWithAi}>
            {tGuestGames("createWithAiCta")}
          </Button>
        </div>
      )}
    </div>
  );
}
