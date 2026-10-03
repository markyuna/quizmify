"use client";

import * as React from "react";
import axios from "axios";
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Clock, Loader2, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import type { ProOfferCandidate, ProOfferCandidatesResponse } from "@/lib/proOffers";
// Pure module -- never import the reward constant from "@/lib/proOffers"
// itself in client code, see the comment in NotificationBell.tsx.
import { PRO_OFFER_REWARD_DAYS } from "@/lib/proOfferConstants";

export default function InviteToProCard({ initialData }: { initialData: ProOfferCandidatesResponse }) {
  const t = useTranslations("Referrals");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["pro-offer-candidates"],
    queryFn: async ({ pageParam }) =>
      (await axios.get<ProOfferCandidatesResponse>("/api/referrals/candidates", { params: { page: pageParam } })).data,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialData: { pages: [initialData], pageParams: [1] },
    // The ranking barely moves minute to minute, and this list isn't
    // actionable from anywhere else -- avoid refetching page 1 every time
    // this card remounts (e.g. navigating away from /referrals and back).
    staleTime: 60_000,
  });

  // The ranking can shift between page fetches (someone's xp changes),
  // which could otherwise surface the same user on two different pages --
  // dedupe defensively when flattening.
  const candidates = React.useMemo(() => {
    const seen = new Set<string>();
    const result: ProOfferCandidate[] = [];
    for (const page of data?.pages ?? []) {
      for (const c of page.candidates) {
        if (seen.has(c.userId)) continue;
        seen.add(c.userId);
        result.push(c);
      }
    }
    return result;
  }, [data]);

  const dailyLimitReached = data?.pages.at(-1)?.dailyLimitReached ?? false;

  const { mutate: sendOffer, isPending, variables } = useMutation({
    mutationFn: async (recipientId: string) =>
      (await axios.post<{ outcome: string }>("/api/referrals/offers", { recipientId })).data,
    onSuccess: (result, recipientId) => {
      if (result.outcome === "created") {
        queryClient.setQueryData<InfiniteData<ProOfferCandidatesResponse> | undefined>(
          ["pro-offer-candidates"],
          (old) =>
            old
              ? {
                  ...old,
                  pages: old.pages.map((p) => ({
                    ...p,
                    candidates: p.candidates.map((c) =>
                      c.userId === recipientId ? { ...c, state: "invited" as const } : c
                    ),
                  })),
                }
              : old
        );
        return;
      }
      if (result.outcome === "daily_limit_reached") {
        toast({ title: t("dailyLimitReached") });
      }
      // already_invited / ineligible -- our cached state was stale, resync.
      queryClient.invalidateQueries({ queryKey: ["pro-offer-candidates"] });
    },
    onError: () => toast({ title: t("offerError"), variant: "destructive" }),
  });

  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <div className="p-4">
        <p className="text-sm font-bold text-foreground">{t("inviteProTitle")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("inviteProSubtitle", { days: PRO_OFFER_REWARD_DAYS })}
        </p>
      </div>

      {dailyLimitReached && (
        <p className="mx-4 mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          {t("dailyLimitReached")}
        </p>
      )}

      {candidates.length === 0 ? (
        <p className="px-4 pb-6 text-center text-sm text-slate-500 dark:text-slate-400">{t("emptyCandidates")}</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {candidates.map((c) => {
              const isThisPending = isPending && variables === c.userId;
              return (
                <li key={c.userId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="h-9 w-9">
                    {c.image && <AvatarImage src={c.image} alt={c.name} />}
                    <AvatarFallback>{c.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.xp} XP</p>
                  </div>

                  {c.state === "invited" ? (
                    <span className="flex shrink-0 items-center gap-1 px-2 text-xs font-medium text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {t("invited")}
                    </span>
                  ) : c.state === "unavailable" ? (
                    <span className="shrink-0 px-2 text-xs text-slate-300 dark:text-slate-600">
                      {t("unavailable")}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isThisPending}
                      onClick={() => sendOffer(c.userId)}
                      className="shrink-0 rounded-lg text-xs"
                    >
                      {isThisPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                      )}
                      {t("inviteCta")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {hasNextPage && (
            <div className="flex justify-center p-3">
              <Button
                size="sm"
                variant="ghost"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                className="rounded-xl text-xs"
              >
                {isFetchingNextPage && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {t("loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
