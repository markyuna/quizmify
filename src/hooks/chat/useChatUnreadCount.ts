"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { chatKeys } from "@/hooks/chat/chatKeys";
import { isClientError, retryUnlessClientError } from "@/lib/chatErrors";

/**
 * The chat bubble's badge. Same cadence as NotificationBell: every 30 s
 * while the tab is visible, plus on window focus. Reads useSession() only
 * for its status -- never calls update(), so it can't count as activity for
 * the idle timeout. Stops polling after any 4xx (e.g. a 401 once the
 * session expired server-side) instead of hammering the route.
 */
export function useChatUnreadCount() {
  const { status } = useSession();

  return useQuery({
    queryKey: chatKeys.unreadCount,
    queryFn: async () => (await axios.get<{ count: number }>("/api/chat/unread-count")).data.count,
    enabled: status === "authenticated",
    refetchInterval: (query) => (isClientError(query.state.error) ? false : 30_000),
    refetchOnWindowFocus: (query) => !isClientError(query.state.error),
    retry: retryUnlessClientError,
  });
}
