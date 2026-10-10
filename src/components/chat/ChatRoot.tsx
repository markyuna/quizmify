"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

import { useChat } from "@/components/chat/ChatProvider";
import ChatBubble from "@/components/chat/ChatBubble";
import { chatKeys } from "@/hooks/chat/chatKeys";

// Only the bubble ships in the initial bundle; the panel (list, rows and
// their queries) is fetched the first time someone opens it -- or a moment
// earlier, when the bubble is hovered, focused or touched (see onPreload).
const loadPanel = () => import("@/components/chat/ChatPanel");
const ChatPanel = dynamic(loadPanel, { ssr: false });

/**
 * Mounted once in the root layout next to <Toaster />: outside the z-10
 * page container, so its z-30 sits above the navbar and MCQ's mobile bar,
 * below toasts (z-100) and every Radix/portal overlay (rendered on <body>).
 * Renders nothing unless signed in.
 */
export default function ChatRoot() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const { isOpen, close, back, clearDrafts } = useChat();

  // Return focus to the bubble after the panel closes -- but not on the
  // first load, where nothing was ever opened. Adjusted during render
  // (React's "store info from previous renders" pattern), not in an effect.
  const [hasOpened, setHasOpened] = React.useState(false);
  if (isOpen && !hasOpened) setHasOpened(true);

  // The idle-timeout logout is client-side (signOut without redirect +
  // router.push), so this provider and the React Query cache both survive
  // it. Reset the panel so the next sign-in starts closed on the list, drop
  // unsent drafts, and drop every chat query: mergeLatest folds new pages
  // into the cached ones, so another account would otherwise inherit this
  // one's messages.
  React.useEffect(() => {
    if (status !== "unauthenticated") return;
    close();
    back();
    clearDrafts();
    queryClient.removeQueries({ queryKey: chatKeys.all });
  }, [status, close, back, clearDrafts, queryClient]);

  if (status !== "authenticated") return null;
  return isOpen ? <ChatPanel /> : <ChatBubble restoreFocus={hasOpened} onPreload={loadPanel} />;
}
