"use client";

import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { parseChatError } from "@/lib/chatErrors";
import { chatKeys } from "@/hooks/chat/chatKeys";
import { useToast } from "./ui/use-toast";

type ChatDiscoverable = {
  discoverable: boolean;
};

const ENDPOINT = "/api/user/chat-discoverable";

/**
 * Toggle for User.chatDiscoverable -- whether non-friends can find this
 * user in the chat panel's "other players" list. Friends always see them.
 * Same optimistic toggle-row look and query/mutation flow as
 * CommunityVisibilityCard.
 */
export default function ChatDiscoverableCard() {
  const t = useTranslations("Chat");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: chatKeys.discoverable,
    queryFn: async () => (await axios.get<ChatDiscoverable>(ENDPOINT)).data,
  });

  const { mutate: updateDiscoverable, isPending } = useMutation({
    mutationFn: async (patch: ChatDiscoverable) => (await axios.patch<ChatDiscoverable>(ENDPOINT, patch)).data,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.discoverable });
      const previous = queryClient.getQueryData<ChatDiscoverable>(chatKeys.discoverable);
      queryClient.setQueryData(chatKeys.discoverable, patch);
      return { previous };
    },
    onError: (error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(chatKeys.discoverable, context.previous);
      }
      const parsed = parseChatError(error);
      toast({ title: t(parsed.key, parsed.values), variant: "destructive" });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(chatKeys.discoverable, updated);
    },
  });

  const checked = data?.discoverable ?? true;

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("privacyTitle")}</p>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={isLoading || isPending}
        onClick={() => updateDiscoverable({ discoverable: !checked })}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/60 p-3 text-left transition disabled:opacity-60 dark:border-white/10 dark:bg-white/5"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
              {t("discoverableLabel")}
            </span>
            <span className="block text-xs text-slate-400">{t("discoverableDesc")}</span>
          </span>
        </span>

        <span
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
            checked ? "bg-violet-500" : "bg-slate-300 dark:bg-white/20"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
              checked ? "translate-x-[22px]" : "translate-x-0.5"
            )}
          />
        </span>
      </button>
    </div>
  );
}
