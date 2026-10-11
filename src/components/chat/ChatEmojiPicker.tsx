"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { EMOJI_CATEGORIES } from "@/components/chat/emojiData";

type Props = {
  id: string;
  onPick: (emoji: string) => void;
  onClose: () => void;
};

/**
 * Panel anchored above the composer (the parent is `relative`). Emoji
 * buttons swallow mousedown so the textarea keeps its focus -- and the
 * mobile keyboard stays up -- while picking.
 */
export default function ChatEmojiPicker({ id, onPick, onClose }: Props) {
  const t = useTranslations("Chat");
  const [categoryKey, setCategoryKey] = React.useState<string>(EMOJI_CATEGORIES[0].key);
  const category = EMOJI_CATEGORIES.find((c) => c.key === categoryKey) ?? EMOJI_CATEGORIES[0];

  // preventDefault on the keydown (not stopPropagation): ChatPanel skips
  // defaultPrevented Escapes, and the event still reaches window for the
  // idle timeout.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onClose();
  };

  return (
    <div
      id={id}
      role="group"
      aria-label={t("emojiPickerLabel")}
      onKeyDown={onKeyDown}
      className="absolute inset-x-3 bottom-full z-10 mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900"
    >
      <div className="flex gap-1 border-b border-slate-200/80 px-2 py-1.5 dark:border-white/10">
        {EMOJI_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setCategoryKey(c.key)}
            aria-label={t(`emojiCategory.${c.key}`)}
            aria-pressed={c.key === category.key}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 dark:hover:bg-white/10",
              c.key === category.key && "bg-violet-100 dark:bg-violet-500/20"
            )}
          >
            <span aria-hidden="true">{c.emojis[0]}</span>
          </button>
        ))}
      </div>
      <div className="grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto overscroll-contain p-2">
        {category.emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(emoji)}
            aria-label={emoji}
            className="flex h-9 items-center justify-center rounded-lg text-xl hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 dark:hover:bg-white/10"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
