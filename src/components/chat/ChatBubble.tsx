"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useChat } from "@/components/chat/ChatProvider";
import { useChatUnreadCount } from "@/hooks/chat/useChatUnreadCount";

type Props = {
  restoreFocus: boolean;
  // Starts downloading the panel's chunk ahead of the click.
  onPreload: () => void;
};

export default function ChatBubble({ restoreFocus, onPreload }: Props) {
  const t = useTranslations("Chat");
  const pathname = usePathname();
  const { open } = useChat();
  const { data: unread = 0 } = useChatUnreadCount();
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (restoreFocus) buttonRef.current?.focus();
  }, [restoreFocus]);

  // MCQ's mobile "Next" bar is fixed to the bottom edge (sm:hidden, ~77px):
  // lift the bubble above it there. Everywhere else it sits at bottom-4.
  const aboveMcqBar = pathname?.startsWith("/play/mcq/") ?? false;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={open}
      onPointerEnter={onPreload}
      onFocus={onPreload}
      onTouchStart={onPreload}
      aria-label={t("bubbleLabel", { count: unread })}
      className={cn(
        "fixed right-4 z-30 mb-[env(safe-area-inset-bottom)] inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 text-white shadow-lg shadow-violet-500/30 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        aboveMcqBar ? "bottom-24 sm:bottom-4" : "bottom-4"
      )}
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-950"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
