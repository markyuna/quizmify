"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HeroMascot from "@/components/HeroMascot";
import type { CategoryTopicLookupResponse } from "@/app/api/category-topics/lookup/route";
import type {
  CategoryTopicSearchResponse,
  CategoryTopicSearchResult,
} from "@/app/api/category-topics/search/route";

// How long the mascot stays in "thinking" pose after the user stops typing.
const THINKING_IDLE_MS = 1000;
// Typeahead debounce -- short enough to feel live, long enough not to hit
// the search endpoint on every keystroke while the user is still typing.
const SUGGESTIONS_DEBOUNCE_MS = 275;

type QuizSearchHeroProps = {
  popularTopics?: string[];
};

export default function QuizSearchHero({ popularTopics = [] }: QuizSearchHeroProps) {
  const t = useTranslations("GuestGames");
  const router = useRouter();
  const locale = useLocale();

  const [searchTopic, setSearchTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const [suggestions, setSuggestions] = useState<CategoryTopicSearchResult[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [notFoundTopic, setNotFoundTopic] = useState<string | null>(null);

  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
      if (suggestionsDebounceRef.current) clearTimeout(suggestionsDebounceRef.current);
      suggestionsAbortRef.current?.abort();
    };
  }, []);

  const fetchSuggestions = (value: string) => {
    suggestionsAbortRef.current?.abort();

    const trimmed = value.trim();
    if (!trimmed) {
      suggestionsAbortRef.current = null;
      setSuggestions([]);
      setIsSearchingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    suggestionsAbortRef.current = controller;
    setIsSearchingSuggestions(true);

    fetch(`/api/category-topics/search?q=${encodeURIComponent(trimmed)}&language=${locale}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: CategoryTopicSearchResponse) => {
        if (suggestionsAbortRef.current !== controller) return;
        setSuggestions(data.results ?? []);
        setIsSearchingSuggestions(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || suggestionsAbortRef.current !== controller) return;
        console.error("Suggestion fetch error:", err);
        setSuggestions([]);
        setIsSearchingSuggestions(false);
      });
  };

  const selectSuggestion = (suggestion: CategoryTopicSearchResult) => {
    router.push(`/quiz?topic=${encodeURIComponent(suggestion.topicDisplay)}&category=${suggestion.categorySlug}`);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const topic = searchTopic.trim();

    if (!topic) {
      setError(t("guestSearchEmptyTopic"));
      return;
    }

    suggestionsAbortRef.current?.abort();
    setSuggestions([]);
    setIsSearchingSuggestions(false);
    setIsLoading(true);
    setError(null);
    setNotFoundTopic(null);

    try {
      // Search-first: does this topic already exist in the catalog?
      // TODO: verificar si /api/guest-quiz-search tiene otros consumidores antes de removerlo
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
      console.error("Search error:", err);
      setError("Failed to search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWithAi = () => {
    const topic = (notFoundTopic ?? searchTopic).trim();
    if (!topic) return;
    router.push(`/quiz?topic=${encodeURIComponent(topic)}`);
  };

  const placeholder =
    popularTopics.length >= 3
      ? t("quizSearchPlaceholderDynamic", {
          t1: popularTopics[0],
          t2: popularTopics[1],
          t3: popularTopics[2],
        })
      : t("quizSearchPlaceholder");

  const showDropdown =
    isInputFocused && searchTopic.trim().length > 0 && (isSearchingSuggestions || suggestions.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative z-10 overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(124,58,237,0.3)]"
    >
      {/* Gradient background (replaces the old dark photo) */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-violet-100 via-white to-cyan-100 dark:from-violet-950 dark:via-slate-950 dark:to-cyan-950" />

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center gap-6 px-6 py-16 md:px-8 md:py-24">
        <HeroMascot thinking={isThinking} notFound={!!notFoundTopic} className="w-36 sm:w-44" />

        <div className="max-w-xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl mb-3 dark:text-white">
            {t("quizSearchTitle")}
          </h2>
          <p className="text-slate-600 text-sm md:text-base dark:text-slate-300">
            {t("quizSearchSubtitle")}
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl space-y-3">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder={placeholder}
                value={searchTopic}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchTopic(value);
                  setError(null);
                  setNotFoundTopic(null);

                  setIsThinking(true);
                  if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
                  thinkingTimeoutRef.current = setTimeout(() => setIsThinking(false), THINKING_IDLE_MS);

                  if (suggestionsDebounceRef.current) clearTimeout(suggestionsDebounceRef.current);
                  suggestionsDebounceRef.current = setTimeout(
                    () => fetchSuggestions(value),
                    SUGGESTIONS_DEBOUNCE_MS
                  );
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                disabled={isLoading}
                className="pl-10 h-12"
              />

              {showDropdown && (
                <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
                  {isSearchingSuggestions && suggestions.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {t("quizSearchSuggestionsLoading")}
                    </p>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto py-1">
                      {suggestions.map((suggestion) => (
                        <li key={suggestion.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectSuggestion(suggestion)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-white/10"
                          >
                            <Search className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate">{suggestion.topicDisplay}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <Button
              type="submit"
              disabled={isLoading || !searchTopic.trim()}
              className="h-12 px-6 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("guestSearchSearching")}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {t("quizSearchSearchCta")}
                </>
              )}
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:bg-red-500/20 dark:border-red-500/40 dark:text-red-200"
            >
              {error}
            </motion.div>
          )}

          {/* Not-found state: topic has no catalog match */}
          {!error && notFoundTopic && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm text-slate-700 dark:border-violet-800 dark:bg-violet-500/10 dark:text-slate-200"
            >
              <p>{t("topicNotFound", { topic: notFoundTopic })}</p>
              <Button type="button" size="sm" onClick={handleCreateWithAi}>
                {t("createWithAiCta")}
              </Button>
            </motion.div>
          )}
        </form>

        {/* Info message */}
        <p className="text-xs text-slate-500 dark:text-white/60 max-w-xl text-center">
          💡 {t("guestSearchInfo", { defaultValue: "First time? Search a topic to try a 5-question preview. Sign up after to save your results and unlock more features." })}
        </p>
      </div>
    </motion.div>
  );
}
