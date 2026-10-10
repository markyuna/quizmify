"use client";

import { useLocale, useTranslations } from "next-intl";

import type { ChatFriendContact } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relativeTime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChat } from "@/components/chat/ChatProvider";

export default function ChatFriendRow({
  friend,
  serverNow,
}: {
  friend: ChatFriendContact;
  serverNow: string | null;
}) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const { openConversation } = useChat();
  const name = friend.name ?? t("anonymousPlayer");

  // `online` is computed server-side; "last seen" uses the server clock
  // (serverNow), same as FriendsManager, never the client's own.
  const presence = friend.online
    ? t("online")
    : friend.lastSeenAt && serverNow
      ? t("lastSeen", { time: formatRelativeTime(friend.lastSeenAt, serverNow, locale) })
      : t("offline");

  return (
    <button
      type="button"
      onClick={() => openConversation(friend.userId)}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:hover:bg-white/5"
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          {friend.image && <AvatarImage src={friend.image} alt="" />}
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        {friend.online && (
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
        <p
          className={cn(
            "truncate text-xs",
            friend.online ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
          )}
        >
          {presence}
        </p>
      </div>
      {friend.unread > 0 && (
        <span className="shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-2 py-0.5 text-xs font-bold text-white">
          <span aria-hidden="true">{friend.unread > 99 ? "99+" : friend.unread}</span>
          <span className="sr-only">{t("unreadCount", { count: friend.unread })}</span>
        </span>
      )}
    </button>
  );
}
