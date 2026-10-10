"use client";

import * as React from "react";
import axios from "axios";
import { useInfiniteQuery } from "@tanstack/react-query";

import type { ChatContactsPage, ChatOtherContact } from "@/lib/chat";
import { chatKeys } from "@/hooks/chat/chatKeys";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { isClientError, retryUnlessClientError } from "@/lib/chatErrors";

const CONTACTS_SEARCH_DEBOUNCE_MS = 300;
const CONTACTS_REFRESH_MS = 60_000;

/**
 * The chat panel's user list, "load more" style (same pattern as
 * InviteToProCard). Friends only come with page 1; "others" are flattened
 * across pages and deduped by userId, since XP can reorder rows between
 * page fetches.
 *
 * `enabled` is "the panel is open". The 60 s refresh (friends' presence)
 * only runs while just page 1 is loaded: an infinite query refetches every
 * loaded page on an interval, so after "load more" the list stays as
 * fetched until the panel reopens or the search changes.
 */
export function useChatContacts(query: string, { enabled }: { enabled: boolean }) {
  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, CONTACTS_SEARCH_DEBOUNCE_MS);

  const result = useInfiniteQuery({
    queryKey: chatKeys.contacts(debouncedQuery),
    queryFn: async ({ pageParam }) =>
      (
        await axios.get<ChatContactsPage>("/api/chat/contacts", {
          params: { q: debouncedQuery || undefined, page: pageParam },
        })
      ).data,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled,
    staleTime: 30_000,
    refetchInterval: (q) =>
      !enabled || isClientError(q.state.error) || (q.state.data?.pages.length ?? 0) > 1 ? false : CONTACTS_REFRESH_MS,
    retry: retryUnlessClientError,
  });

  const { friends, others } = React.useMemo(() => {
    const pages = result.data?.pages ?? [];
    const seen = new Set<string>();
    const flatOthers: ChatOtherContact[] = [];
    for (const page of pages) {
      for (const contact of page.others) {
        if (seen.has(contact.userId)) continue;
        seen.add(contact.userId);
        flatOthers.push(contact);
      }
    }
    return { friends: pages[0]?.friends ?? [], others: flatOthers };
  }, [result.data]);

  return {
    ...result,
    friends,
    others,
    serverNow: result.data?.pages[0]?.serverNow ?? null,
    isDebouncing: debouncedQuery !== trimmed,
  };
}
