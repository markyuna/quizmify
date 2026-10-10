"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";

import type { ChatContactsPage, ChatFriendContact } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useChat } from "@/components/chat/ChatProvider";
import ChatContactsView from "@/components/chat/ChatContactsView";
import ChatConversationView from "@/components/chat/ChatConversationView";
import { describePresence } from "@/components/chat/chatFormat";
import { chatKeys } from "@/hooks/chat/chatKeys";

// Below Tailwind's sm: the panel is full screen and behaves as a modal.
const MOBILE_QUERY = "(max-width: 639px)";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Layers rendered outside the panel that a click must NOT close it from:
// Radix poppers (dropdown menus, tooltips), Radix dialog / alertdialog
// content (the panel's own role="dialog" has no data-state), and the toasts
// (they sit right over the panel's corner on desktop).
const KEEP_OPEN_SELECTOR = [
  "[data-radix-popper-content-wrapper]",
  '[role="dialog"][data-state]',
  '[role="alertdialog"]',
  "[data-toast-viewport]",
  "[data-swipe-direction]",
].join(", ");

// While a Radix modal is open (block / report confirmations, the idle
// warning) every click belongs to it: never close the panel underneath.
const OPEN_MODAL_SELECTOR = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';

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

/**
 * On mobile, iOS doesn't shrink 100dvh when the virtual keyboard opens (and
 * Chrome on Android no longer resizes the layout viewport by default): the
 * full-screen panel would extend under the keyboard and hide the composer.
 * Track the visual viewport instead -- its height excludes the keyboard and
 * offsetTop is how far the browser scrolled to reveal the focused field.
 * Returns null on desktop and where visualViewport doesn't exist, so the
 * CSS sizes (100dvh / 520px) apply untouched.
 */
function useVisualViewportBox(enabled: boolean): { height: number; top: number } | null {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const viewport = window.visualViewport;
      if (!enabled || !viewport) return () => {};
      viewport.addEventListener("resize", onChange);
      viewport.addEventListener("scroll", onChange);
      return () => {
        viewport.removeEventListener("resize", onChange);
        viewport.removeEventListener("scroll", onChange);
      };
    },
    [enabled]
  );
  // A string snapshot: useSyncExternalStore needs a stable primitive.
  const snapshot = React.useSyncExternalStore(
    subscribe,
    () => {
      const viewport = window.visualViewport;
      return enabled && viewport ? `${Math.round(viewport.height)}:${Math.round(viewport.offsetTop)}` : null;
    },
    () => null
  );
  return React.useMemo(() => {
    if (!snapshot) return null;
    const [height, top] = snapshot.split(":").map(Number);
    return { height, top };
  }, [snapshot]);
}

/** The open conversation's friend (and that page's server clock), from whatever contacts page already holds them. */
function findFriend(
  queryClient: QueryClient,
  userId: string
): { friend: ChatFriendContact; serverNow: string } | null {
  for (const [, data] of queryClient.getQueriesData<InfiniteData<ChatContactsPage>>({
    queryKey: chatKeys.contactsAll,
  })) {
    const page = data?.pages[0];
    const friend = page?.friends.find((f) => f.userId === userId);
    if (page && friend) return { friend, serverNow: page.serverNow };
  }
  return null;
}

export default function ChatPanel() {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { activeUserId, close, back } = useChat();
  const isMobile = useIsMobile();
  const viewportBox = useVisualViewportBox(isMobile);
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

  // Desktop / tablet only: on mobile the panel is full screen, there is no
  // "outside". The panel only mounts while open, so this listener only
  // exists while open; the click that opened it already went by (the bubble
  // opens on `click`, after pointerdown). pointerdown, not click, so ending
  // a text selection outside doesn't close it. Capture phase so a handler
  // that stops propagation can't hide the event -- and nothing here calls
  // preventDefault/stopPropagation: the page still gets its click, and the
  // idle-timeout listeners still see every event.
  React.useEffect(() => {
    if (isMobile) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const panel = panelRef.current;
      if (!panel) return;
      const path = event.composedPath();
      if (path.includes(panel)) return;
      if (path.some((node) => node instanceof Element && node.matches(KEEP_OPEN_SELECTOR))) return;
      if (document.querySelector(OPEN_MODAL_SELECTOR)) return;
      close({ restoreFocus: false });
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, [isMobile, close]);

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

  const active = activeUserId ? findFriend(queryClient, activeUserId) : null;
  const activeName = active?.friend.name ?? t("anonymousPlayer");
  // No presence line when the friend isn't in the contacts cache.
  const presence = active ? describePresence(active.friend, active.serverNow, locale) : null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal={isMobile || undefined}
      aria-label={t("title")}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      // Mobile + visualViewport only: top + height over-constrain inset-0,
      // so `bottom` is ignored and the panel ends where the keyboard starts.
      style={viewportBox ? { top: viewportBox.top, height: viewportBox.height } : undefined}
      className="fixed inset-0 z-30 flex h-[100dvh] flex-col bg-white outline-none dark:bg-slate-950 sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[520px] sm:max-h-[calc(100dvh-2rem)] sm:w-[360px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-slate-200/80 sm:shadow-2xl sm:shadow-violet-500/10 sm:dark:border-white/10"
    >
      <header className="flex items-center gap-2 border-b border-slate-200/80 px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] dark:border-white/10">
        {activeUserId ? (
          <>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={handleBack} aria-label={t("back")}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Avatar className="h-8 w-8 shrink-0">
              {active?.friend.image && <AvatarImage src={active.friend.image} alt="" />}
              <AvatarFallback>{activeName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">{activeName}</h2>
              {presence && (
                <p
                  className={cn(
                    "truncate text-xs",
                    presence.key === "online" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {presence.key === "lastSeen" ? t("lastSeen", { time: presence.time }) : t(presence.key)}
                </p>
              )}
            </div>
          </>
        ) : (
          <h2 className="flex-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text px-1 text-lg font-bold text-transparent">
            {t("title")}
          </h2>
        )}
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => close()} aria-label={t("close")}>
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </header>

      {/* Keyed by user: switching conversation resets scroll and read tracking. */}
      {activeUserId ? (
        <ChatConversationView key={activeUserId} userId={activeUserId} name={activeName} />
      ) : (
        <ChatContactsView />
      )}
    </div>
  );
}
