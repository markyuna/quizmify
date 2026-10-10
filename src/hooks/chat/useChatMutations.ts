"use client";

import axios from "axios";
import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";

import type { ChatContactsPage, ChatMessageItem, ChatReportReason } from "@/lib/chat";
import type { FriendRequestOutcome } from "@/lib/friends";
import {
  FRIENDS_OVERVIEW_KEY,
  NOTIFICATIONS_KEY,
  NOTIFICATIONS_UNREAD_KEY,
  chatKeys,
} from "@/hooks/chat/chatKeys";
import { mergeById, type ChatMessagesCache } from "@/hooks/chat/useChatMessages";

// Every request here is a plain axios call to the chat/friends routes --
// never useSession().update(), so nothing counts as idle-timeout activity.

function updateContacts(
  queryClient: QueryClient,
  update: (page: ChatContactsPage) => ChatContactsPage
) {
  queryClient.setQueriesData<InfiniteData<ChatContactsPage>>({ queryKey: chatKeys.contactsAll }, (data) =>
    data ? { ...data, pages: data.pages.map(update) } : data
  );
}

function invalidateFriendships(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: chatKeys.contactsAll });
  queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount });
  queryClient.invalidateQueries({ queryKey: FRIENDS_OVERVIEW_KEY });
  queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_KEY });
}

export function useSendChatMessage(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      (
        await axios.post<{ message: ChatMessageItem }>(
          `/api/chat/conversations/${encodeURIComponent(userId)}/messages`,
          { body }
        )
      ).data.message,
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessagesCache>(chatKeys.messages(userId), (prev) =>
        prev ? { ...prev, messages: mergeById(prev.messages, [message]) } : prev
      );
    },
  });
}

export function useMarkConversationRead(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axios.post(`/api/chat/conversations/${encodeURIComponent(userId)}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount });
      updateContacts(queryClient, (page) => ({
        ...page,
        friends: page.friends.map((friend) => (friend.userId === userId ? { ...friend, unread: 0 } : friend)),
      }));
    },
  });
}

/** A block also ends the friendship and clears friend bell rows server-side. */
export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await axios.post(`/api/chat/blocks/${encodeURIComponent(userId)}`);
    },
    onSuccess: (_data, userId) => {
      invalidateFriendships(queryClient);
      // Its next fetch answers 403 BLOCKED_BY_YOU, which the view shows.
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(userId) });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete(`/api/chat/blocks/${encodeURIComponent(userId)}`);
    },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.contactsAll });
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(userId) });
    },
  });
}

export function useReportChatMessage() {
  return useMutation({
    mutationFn: async ({ messageId, reason }: { messageId: string; reason: ChatReportReason }) => {
      await axios.post(`/api/chat/messages/${encodeURIComponent(messageId)}/report`, { reason });
    },
  });
}

/** The "+" on a non-friend: reuses POST /api/friends (same flow, lands in their bell). */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) =>
      (await axios.post<{ outcome: FriendRequestOutcome }>("/api/friends", { targetUserId })).data.outcome,
    onSuccess: (outcome, targetUserId) => {
      if (outcome === "created" || outcome === "already_pending") {
        updateContacts(queryClient, (page) => ({
          ...page,
          others: page.others.map((contact) =>
            contact.userId === targetUserId ? { ...contact, relation: "pending_sent" } : contact
          ),
        }));
        queryClient.invalidateQueries({ queryKey: FRIENDS_OVERVIEW_KEY });
        return;
      }
      // auto_accepted / already_friends: they move to the friends block.
      invalidateFriendships(queryClient);
    },
  });
}

/** Accepting a pending_received row, via the existing PATCH /api/friends/[friendshipId]. */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      await axios.patch(`/api/friends/${encodeURIComponent(friendshipId)}`, { action: "accept" });
    },
    onSuccess: () => invalidateFriendships(queryClient),
  });
}
