"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTopicSuggestions } from "@/hooks/useTopicSuggestions";
import type { CategoryTopicLookupResponse } from "@/app/api/category-topics/lookup/route";
import type { CategoryTopicSearchResult } from "@/app/api/category-topics/search/route";

// The lookup-then-redirect resolution logic (handleSearch/handleCreateWithAi
// below) is standalone, not shared with QuizSearchHero.tsx -- see the plan
// discussion: that component's mascot/animation machinery is delicate and
// already shipped on the home + /games, and this resolution logic is small
// enough that duplicating it is lower risk than refactoring it in. The
// typeahead suggestions below DO share logic with QuizSearchHero, via
// useTopicSuggestions (no mascot coupling there to begin with) -- just
// rendered as a plain, non-animated dropdown instead of the mascot card.
export default function CompactCategorySearch() {
  const t = useTranslations("CategoriesPage");
  const tGuestGames = useTranslations("GuestGames");
  const router = useRouter();
  const locale = useLocale();

  const [searchTopic, setSearchTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFoundTopic, setNotFoundTopic] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { suggestions, isSearchingSuggestions, queueSuggestions, clearSuggestions } = useTopicSuggestions();

  const selectSuggestion = (suggestion: CategoryTopicSearchResult) => {
    router.push(`/quiz?topic=${encodeURIComponent(suggestion.topicDisplay)}&category=${suggestion.categorySlug}`);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const topic = searchTopic.trim();

    if (!topic) {
      setError(tGuestGames("guestSearchEmptyTopic"));
      return;
    }

    clearSuggestions();
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
              const value = e.target.value;
              setSearchTopic(value);
              setError(null);
              setNotFoundTopic(null);
              queueSuggestions(value);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isLoading}
            className="h-10 pl-9"
          />

          {isFocused && searchTopic.trim().length > 0 && (isSearchingSuggestions || suggestions.length > 0) && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
              {isSearchingSuggestions && suggestions.length === 0 ? (
                <p className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                  {tGuestGames("quizSearchSuggestionsLoading")}
                </p>
              ) : (
                <ul className="max-h-56 overflow-y-auto py-1">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(suggestion)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{suggestion.topicDisplay}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
