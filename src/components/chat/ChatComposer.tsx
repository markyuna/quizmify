"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { SendHorizontal, Smile } from "lucide-react";

import { parseChatError, type ParsedChatError } from "@/lib/chatErrors";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/components/chat/ChatProvider";
import ChatEmojiPicker from "@/components/chat/ChatEmojiPicker";
import { CHAT_COUNTER_THRESHOLD, CHAT_MESSAGE_MAX_LENGTH } from "@/components/chat/chatLimits";
import { chatKeys } from "@/hooks/chat/chatKeys";
import { useSendChatMessage } from "@/hooks/chat/useChatMutations";

// A send refused because the conversation closed meanwhile: refetch the
// messages so the view swaps this composer for the "closed" notice.
const CLOSING_CODES = new Set(["NOT_FRIENDS", "BLOCKED_BY_YOU"]);

export default function ChatComposer({ userId }: { userId: string }) {
  const t = useTranslations("Chat");
  const queryClient = useQueryClient();
  const { getDraft, setDraft } = useChat();
  const send = useSendChatMessage(userId);
  // Restores this conversation's unsent draft (kept in memory by ChatProvider).
  const [text, setText] = React.useState(() => getDraft(userId));
  const [error, setError] = React.useState<ParsedChatError | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const errorId = React.useId();
  const pickerId = React.useId();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  // Caret to restore after an emoji is inserted (state updates are async).
  const pendingCaretRef = React.useRef<number | null>(null);
  // The send can settle after the panel closed (Esc, X, or a click outside
  // mid-request): only touch local state and focus while still mounted.
  const mountedRef = React.useRef(false);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !send.isPending;

  const updateText = (next: string) => {
    setText(next);
    setDraft(userId, next);
  };

  React.useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    const textarea = textareaRef.current;
    if (caret === null || !textarea) return;
    pendingCaretRef.current = null;
    textarea.setSelectionRange(caret, caret);
  }, [text]);

  // Inserts at the caret / over the selection; ignored if it would pass the cap.
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? text.length;
    const end = textarea?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    if (next.length > CHAT_MESSAGE_MAX_LENGTH) return;
    pendingCaretRef.current = start + emoji.length;
    updateText(next);
    if (error) setError(null);
  };

  const closePicker = () => {
    setPickerOpen(false);
    textareaRef.current?.focus();
  };

  const submit = () => {
    if (!canSend) return;
    setError(null);
    const sentText = text;
    // mutateAsync rather than mutate(…, { onSuccess }): per-call callbacks
    // are dropped once the component unmounts, which would leave an
    // already-sent message sitting in the draft. This promise settles either way.
    send
      .mutateAsync(trimmed)
      .then(() => {
        // Cleared only on success: a failed send keeps the text for a retry.
        // Whatever was typed while the request was in flight survives: if the
        // draft still starts with the sent text, only that prefix goes; if
        // it was edited some other way, it's left intact.
        const current = getDraft(userId);
        const remaining =
          current === sentText ? "" : current.startsWith(sentText) ? current.slice(sentText.length) : current;
        if (remaining === current) return;
        setDraft(userId, remaining);
        if (!mountedRef.current) return;
        setText(remaining);
        textareaRef.current?.focus();
      })
      .catch((sendError: unknown) => {
        // Unmounted: the draft still holds the text, so reopening the
        // conversation brings it back for a retry; there's nowhere to show
        // the error, and the next open refetches the messages anyway.
        if (!mountedRef.current) return;
        const parsed = parseChatError(sendError);
        setError(parsed);
        if (parsed.code && CLOSING_CODES.has(parsed.code)) {
          queryClient.invalidateQueries({ queryKey: chatKeys.messages(userId) });
        }
      });
  };

  // Enter sends, Shift+Enter breaks the line. Never while an IME is
  // composing: isComposing, plus keyCode 229 for Safari, which reports the
  // confirming Enter with isComposing already false. No stopPropagation:
  // the keydown must still reach window for the idle timeout.
  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    submit();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="relative border-t border-slate-200/80 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/10"
    >
      {pickerOpen && <ChatEmojiPicker id={pickerId} onPick={insertEmoji} onClose={closePicker} />}
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={() => setPickerOpen((open) => !open)}
          aria-label={t("emojiButton")}
          aria-expanded={pickerOpen}
          aria-controls={pickerOpen ? pickerId : undefined}
        >
          <Smile className="h-5 w-5" aria-hidden="true" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => {
            updateText(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("messagePlaceholder")}
          aria-label={t("messagePlaceholder")}
          aria-describedby={errorId}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          enterKeyHint="send"
          rows={1}
          // 16px on mobile: iOS Safari zooms the whole page on focus for any
          // input under 16px, pushing the send button off screen.
          className="field-sizing-content max-h-32 min-h-11 resize-none py-2.5 text-base sm:text-sm"
        />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!canSend} aria-label={t("send")}>
          <SendHorizontal className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      {text.length >= CHAT_COUNTER_THRESHOLD && (
        <p className="mt-1 text-right text-[11px] text-slate-500 dark:text-slate-400">
          {t("charCount", { count: text.length, max: CHAT_MESSAGE_MAX_LENGTH })}
        </p>
      )}
      {/* Always mounted, so screen readers announce the error when it appears. */}
      <p id={errorId} aria-live="polite" className="mt-1 text-xs text-rose-600 empty:hidden dark:text-rose-400">
        {error ? t(error.key, error.values) : null}
      </p>
    </form>
  );
}
