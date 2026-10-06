"use client";

import * as React from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Radio } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "./ui/use-toast";

type CommunityVisibility = {
  showInCommunityFeed: boolean;
};

const QUERY_KEY = ["community-visibility"];

/**
 * Single toggle for User.showInCommunityFeed -- whether the homepage
 * community ticker may show this user's recent games. Same optimistic
 * toggle-row look and query/mutation flow as NotificationPreferencesCard.
 */
export default function CommunityVisibilityCard() {
  const t = useTranslations("Account");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await axios.get<CommunityVisibility>("/api/user/community-visibility");
      return res.data;
    },
  });

  const { mutate: updateVisibility, isPending } = useMutation({
    mutationFn: async (patch: CommunityVisibility) => {
      const res = await axios.patch<CommunityVisibility>("/api/user/community-visibility", patch);
      return res.data;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<CommunityVisibility>(QUERY_KEY);
      queryClient.setQueryData(QUERY_KEY, patch);
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
      toast({ title: t("somethingWentWrong"), variant: "destructive" });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEY, updated);
    },
  });

  const checked = data?.showInCommunityFeed ?? true;

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("communityTitle")}</p>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={isLoading || isPending}
        onClick={() => updateVisibility({ showInCommunityFeed: !checked })}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/60 p-3 text-left transition disabled:opacity-60 dark:border-white/10 dark:bg-white/5"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400">
            <Radio className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
              {t("communityFeedLabel")}
            </span>
            <span className="block text-xs text-slate-400">{t("communityFeedDesc")}</span>
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
