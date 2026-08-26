"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

import type {
  CategoryTopicSearchResponse,
  CategoryTopicSearchResult,
} from "@/app/api/category-topics/search/route";

// Typeahead debounce -- short enough to feel live, long enough not to hit
// the search endpoint on every keystroke while the user is still typing.
// Shared value: QuizSearchHero and CompactCategorySearch both use this hook.
const SUGGESTIONS_DEBOUNCE_MS = 275;

export function useTopicSuggestions() {
  const locale = useLocale();

  const [suggestions, setSuggestions] = useState<CategoryTopicSearchResult[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const fetchSuggestions = (value: string) => {
    abortRef.current?.abort();

    const trimmed = value.trim();
    if (!trimmed) {
      abortRef.current = null;
      setSuggestions([]);
      setIsSearchingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearchingSuggestions(true);

    fetch(`/api/category-topics/search?q=${encodeURIComponent(trimmed)}&language=${locale}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: CategoryTopicSearchResponse) => {
        if (abortRef.current !== controller) return;
        setSuggestions(data.results ?? []);
        setIsSearchingSuggestions(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || abortRef.current !== controller) return;
        console.error("Suggestion fetch error:", err);
        setSuggestions([]);
        setIsSearchingSuggestions(false);
      });
  };

  const queueSuggestions = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), SUGGESTIONS_DEBOUNCE_MS);
  };

  const clearSuggestions = () => {
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSuggestions([]);
    setIsSearchingSuggestions(false);
  };

  return { suggestions, isSearchingSuggestions, queueSuggestions, clearSuggestions };
}
