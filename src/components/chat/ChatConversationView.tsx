"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { parseChatError } from "@/lib/chatErrors";
import { Button } from "@/components/ui/button";
import { useChat } from "@/components/chat/ChatProvider";
import { dayKey, formatDayLabel, formatMessageTime } from "@/components/chat/chatFormat";
import { useChatMessages } from "@/hooks/chat/useChatMessages";
import { useMarkConversationRead } from "@/hooks/chat/useChatMutations";

// How close to the bottom (px) still counts as "reading the latest".
const NEAR_BOTTOM_PX = 80;

// Errors that close the conversation: the two 403s, plus an expired session.
const CLOSED_CODES = new Set(["NOT_FRIENDS", "BLOCKED_BY_YOU", "UNAUTHORIZED"]);

const mutedLine = "px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400";

type OlderAnchor = { height: number; top: number; firstId: string | undefined };

export default function ChatConversationView({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const { isOpen } = useChat();
  const conversation = useChatMessages(userId, { active: isOpen });
  const { mutate: markRead } = useMarkConversationRead(userId);

  const listRef = React.useRef<HTMLDivElement>(null);
  const nearBottomRef = React.useRef(true);
  const olderAnchorRef = React.useRef<OlderAnchor | null>(null);
  const lastMarkedRef = React.useRef<string | null>(null);

  const parsedError = conversation.error ? parseChatError(conversation.error) : null;
  const closedKey = parsedError?.code && CLOSED_CODES.has(parsedError.code) ? parsedError.key : null;
  // TanStack keeps the previous data when a refetch fails: a closed
  // conversation must stop showing what was cached before the 403.
  const messages = closedKey ? [] : conversation.messages;
  const serverNow = conversation.serverNow;

  const lastMessage = messages.at(-1);
  const lastId = lastMessage?.id;
  const lastIsMine = lastMessage?.mine ?? false;
  const firstId = messages[0]?.id;
  // A plain string, so the mark-as-read effect below only re-runs when the
  // latest message from them actually changes.
  const lastIncomingId = messages.findLast((message) => !message.mine)?.id ?? null;

  // Mark as read on open and whenever a new message from them arrives --
  // only while the tab is visible, and at most once per "latest message
  // from them" (a sentinel covers opening a conversation with none yet).
  const loaded = conversation.isSuccess && !closedKey;
  React.useEffect(() => {
    if (!isOpen || !loaded) return;
    const target = lastIncomingId ?? "opened";
    const tryMark = () => {
      if (document.visibilityState !== "visible" || lastMarkedRef.current === target) return;
      lastMarkedRef.current = target;
      markRead();
    };
    tryMark();
    document.addEventListener("visibilitychange", tryMark);
    return () => document.removeEventListener("visibilitychange", tryMark);
  }, [isOpen, loaded, lastIncomingId, markRead]);

  const onScroll = () => {
    const list = listRef.current;
    if (!list) return;
    nearBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM_PX;
  };

  // Older page prepended: keep the reader exactly where they were. Only when
  // the first message really changed since the anchor was taken. The list
  // sets overflow-anchor: none, so the browser doesn't also compensate.
  React.useLayoutEffect(() => {
    const list = listRef.current;
    const anchor = olderAnchorRef.current;
    if (!list || !anchor || anchor.firstId === firstId) return;
    olderAnchorRef.current = null;
    list.scrollTop = anchor.top + (list.scrollHeight - anchor.height);
  }, [firstId]);

  // The older load finished without prepending anything (error, or nothing
  // older): drop the anchor so a later, unrelated change can't use it.
  React.useEffect(() => {
    if (!conversation.isLoadingOlder && olderAnchorRef.current?.firstId === firstId) {
      olderAnchorRef.current = null;
    }
  }, [conversation.isLoadingOlder, firstId]);

  // First load and new messages at the bottom: follow them only if the
  // reader was already near the bottom, or it's their own message.
  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !lastId) return;
    if (nearBottomRef.current || lastIsMine) {
      list.scrollTop = list.scrollHeight;
      nearBottomRef.current = true;
    }
  }, [lastId, lastIsMine]);

  // The list shrinks when the mobile keyboard opens (panel resized to the
  // visual viewport): stay pinned to the bottom if that's where the reader was.
  React.useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (nearBottomRef.current) list.scrollTop = list.scrollHeight;
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  const loadOlder = () => {
    const list = listRef.current;
    if (list) olderAnchorRef.current = { height: list.scrollHeight, top: list.scrollTop, firstId };
    conversation.loadOlder();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label={t("openConversation", { name })}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [overflow-anchor:none]"
      >
        {closedKey ? null : conversation.isPending ? (
          <p className={mutedLine}>{t("loading")}</p>
        ) : parsedError && messages.length === 0 ? (
          <p role="alert" className={mutedLine}>
            {t(parsedError.key, parsedError.values)}
          </p>
        ) : messages.length === 0 ? (
          <p className={mutedLine}>{t("noMessages")}</p>
        ) : (
          <>
            {conversation.hasOlder && (
              <div className="mb-3 flex justify-center">
                <Button variant="outline" size="sm" onClick={loadOlder} disabled={conversation.isLoadingOlder}>
                  {conversation.isLoadingOlder ? t("loading") : t("loadOlder")}
                </Button>
              </div>
            )}
            <ol className="space-y-1.5">
              {messages.map((message, index) => {
                const startsDay =
                  serverNow !== null &&
                  (index === 0 || dayKey(messages[index - 1].createdAt) !== dayKey(message.createdAt));
                return (
                  <li key={message.id}>
                    {startsDay && (
                      <p className="py-2 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {formatDayLabel(message.createdAt, serverNow, locale)}
                      </p>
                    )}
                    <div className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                          message.mine
                            ? "rounded-br-md bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white"
                            : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
                        )}
                      >
                        {/* Plain text only: React escapes it and nothing is auto-linked. */}
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p>
                        <p
                          className={cn(
                            "mt-1 text-right text-[10px]",
                            message.mine ? "text-white/70" : "text-slate-500 dark:text-slate-400"
                          )}
                        >
                          <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt, locale)}</time>
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      {closedKey && (
        <p
          role="status"
          className="border-t border-slate-200/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm text-slate-600 dark:border-white/10 dark:text-slate-300"
        >
          {t(closedKey)}
        </p>
      )}
    </div>
  );
}
