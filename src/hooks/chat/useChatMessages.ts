"use client";

import * as React from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ChatMessageItem, ChatMessagesPage } from "@/lib/chat";
import { chatKeys } from "@/hooks/chat/chatKeys";
import { isClientError, retryUnlessClientError } from "@/lib/chatErrors";

const MESSAGES_POLL_MS = 4_000;

/** One cache entry per conversation: every message seen so far, chronological. */
export type ChatMessagesCache = {
  messages: ChatMessageItem[];
  hasOlder: boolean;
  olderCursor: string | null;
  serverNow: string;
  otherLastReadAt: string | null;
};

async function fetchPage(userId: string, before?: string): Promise<ChatMessagesPage> {
  const url = `/api/chat/conversations/${encodeURIComponent(userId)}/messages`;
  return (await axios.get<ChatMessagesPage>(url, { params: before ? { before } : undefined })).data;
}

export function mergeById(a: ChatMessageItem[], b: ChatMessageItem[]): ChatMessageItem[] {
  const byId = new Map<string, ChatMessageItem>();
  for (const message of [...a, ...b]) byId.set(message.id, message);
  return [...byId.values()].sort((x, y) => x.createdAt.localeCompare(y.createdAt) || x.id.localeCompare(y.id));
}

/**
 * Folds a fresh "latest page" into what we already hold. The backend has no
 * `after` cursor, so each poll returns the newest page (30). If that page
 * doesn't reach back to anything we hold and older messages exist, more
 * than a page arrived while polling was paused (hidden tab): restart from
 * the fresh page rather than render a silent hole in the history.
 */
function mergeLatest(prev: ChatMessagesCache | undefined, page: ChatMessagesPage): ChatMessagesCache {
  const fresh: ChatMessagesCache = {
    messages: page.messages,
    hasOlder: page.hasMore,
    olderCursor: page.nextBefore,
    serverNow: page.serverNow,
    otherLastReadAt: page.otherLastReadAt,
  };
  if (!prev || prev.messages.length === 0) return fresh;
  if (!page.hasMore) return { ...fresh, messages: mergeById(prev.messages, page.messages) };

  const known = new Set(prev.messages.map((message) => message.id));
  if (!page.messages.some((message) => known.has(message.id))) return fresh;

  return {
    ...prev,
    messages: mergeById(prev.messages, page.messages),
    serverNow: page.serverNow,
    otherLastReadAt: page.otherLastReadAt,
  };
}

/**
 * Messages of one conversation. `active` is "this conversation is open in
 * the panel": the newest page is polled every 4 s only then, and only while
 * the tab is visible (TanStack's refetchIntervalInBackground stays false).
 * Any 4xx stops polling -- 401 (session gone), or 403 NOT_FRIENDS /
 * BLOCKED_BY_YOU (the conversation just closed).
 */
export function useChatMessages(userId: string | null, { active }: { active: boolean }) {
  const queryClient = useQueryClient();
  const key = chatKeys.messages(userId ?? "");

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const page = await fetchPage(userId!);
      // Read the cache after the request: a "load older" that landed
      // meanwhile is kept, not overwritten.
      return mergeLatest(queryClient.getQueryData<ChatMessagesCache>(key), page);
    },
    enabled: active && userId !== null,
    refetchInterval: (q) => (isClientError(q.state.error) ? false : MESSAGES_POLL_MS),
    retry: retryUnlessClientError,
  });

  const older = useMutation({
    mutationFn: async () => {
      const current = queryClient.getQueryData<ChatMessagesCache>(key);
      if (!userId || !current?.hasOlder || !current.olderCursor) return null;
      return fetchPage(userId, current.olderCursor);
    },
    onSuccess: (page) => {
      if (!page) return;
      queryClient.setQueryData<ChatMessagesCache>(key, (prev) =>
        prev
          ? { ...prev, messages: mergeById(page.messages, prev.messages), hasOlder: page.hasMore, olderCursor: page.nextBefore }
          : prev
      );
    },
  });

  const loadOlder = React.useCallback(() => older.mutate(), [older]);

  return {
    ...query,
    messages: query.data?.messages ?? [],
    hasOlder: query.data?.hasOlder ?? false,
    serverNow: query.data?.serverNow ?? null,
    otherLastReadAt: query.data?.otherLastReadAt ?? null,
    loadOlder,
    isLoadingOlder: older.isPending,
    loadOlderError: older.error,
  };
}
