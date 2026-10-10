"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";

import type { ChatContactsPage } from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { useChat } from "@/components/chat/ChatProvider";
import { chatKeys } from "@/hooks/chat/chatKeys";

// Below Tailwind's sm: the panel is full screen and behaves as a modal.
const MOBILE_QUERY = "(max-width: 639px)";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(MOBILE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}

/** The open conversation's name, from whatever contacts page already holds that friend. */
function findFriendName(queryClient: QueryClient, userId: string): string | null {
  for (const [, data] of queryClient.getQueriesData<InfiniteData<ChatContactsPage>>({
    queryKey: chatKeys.contactsAll,
  })) {
    const friend = data?.pages[0]?.friends.find((f) => f.userId === userId);
    if (friend) return friend.name;
  }
  return null;
}

export default function ChatPanel() {
  const t = useTranslations("Chat");
  const queryClient = useQueryClient();
  const { activeUserId, close, back } = useChat();
  const isMobile = useIsMobile();
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Move focus into the panel when it opens.
  React.useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Full screen on mobile: lock the page scroll behind it.
  React.useEffect(() => {
    if (!isMobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobile]);

  // Esc closes; on mobile (full screen = modal) Tab wraps inside the panel.
  // Only for keys pressed inside the panel's own DOM: React events bubble
  // through the component tree even out of a portal, so an Escape meant for
  // a Radix dialog opened from here must not close the panel too. Never
  // stopPropagation: these keydowns must still reach window, where
  // useIdleTimeout counts them as activity.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel || !(event.target instanceof Node) || !panel.contains(event.target)) return;

    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key !== "Tab" || !isMobile) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Back to the list: refetch contacts so the friend's unread count isn't
  // left stale by the 30 s staleTime.
  const handleBack = () => {
    queryClient.invalidateQueries({ queryKey: chatKeys.contactsAll });
    back();
  };

  const activeName = activeUserId ? findFriendName(queryClient, activeUserId) : null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal={isMobile || undefined}
      aria-label={t("title")}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-30 flex h-[100dvh] flex-col bg-white outline-none dark:bg-slate-950 sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[520px] sm:max-h-[calc(100dvh-2rem)] sm:w-[360px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-slate-200/80 sm:shadow-2xl sm:shadow-violet-500/10 sm:dark:border-white/10"
    >
      <header className="flex items-center gap-2 border-b border-slate-200/80 px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] dark:border-white/10">
        {activeUserId ? (
          <>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={handleBack} aria-label={t("back")}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <h2 className="min-w-0 flex-1 truncate text-base font-bold text-slate-900 dark:text-white">
              {activeName ?? t("anonymousPlayer")}
            </h2>
          </>
        ) : (
          <h2 className="flex-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text px-1 text-lg font-bold text-transparent">
            {t("title")}
          </h2>
        )}
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={close} aria-label={t("close")}>
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </header>

      {/* Contacts list lands in the next commit; the conversation view in phase 4c. */}
      <div className="flex-1" />
    </div>
  );
}
