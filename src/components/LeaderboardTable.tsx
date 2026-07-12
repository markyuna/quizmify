"use client";

import * as React from "react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, Clock, Crown, Loader2, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";
import type { LeaderboardPage } from "@/lib/leaderboard";

type LeaderboardTableProps = {
  initialData: LeaderboardPage;
  topics: Array<{ topic: string; players: number }>;
  /** These three are optional so this component still works wherever it's
   * rendered without friend context -- the add-friend button is simply
   * omitted when currentUserId isn't provided. */
  currentUserId?: string;
  friendUserIds?: string[];
  pendingUserIds?: string[];
};

function AddFriendCell({
  targetUserId,
  isFriend,
  isPending,
}: {
  targetUserId: string;
  isFriend: boolean;
  isPending: boolean;
}) {
  const t = useTranslations("Friends");
  const { toast } = useToast();
  const [justSent, setJustSent] = React.useState(false);

  const { mutate: sendRequest, isPending: isSending } = useMutation({
    mutationFn: async () => axios.post("/api/friends", { targetUserId }),
    onSuccess: () => setJustSent(true),
    onError: () => toast({ title: t("error"), variant: "destructive" }),
  });

  if (isFriend) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-emerald-500" title={t("alreadyFriends")}>
        <Check className="h-4 w-4" />
      </span>
    );
  }

  if (isPending || justSent) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-300" title={t("alreadyPending")}>
        <Clock className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={isSending}
      onClick={() => sendRequest()}
      aria-label={t("addFriendCta")}
      className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:text-violet-600"
    >
      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
    </Button>
  );
}

export default function LeaderboardTable({
  initialData,
  topics,
  currentUserId,
  friendUserIds = [],
  pendingUserIds = [],
}: LeaderboardTableProps) {
  const t = useTranslations("Leaderboard");

  const [topic, setTopic] = React.useState<string | null>(initialData.topic);
  const [page, setPage] = React.useState(initialData.page);
  const [data, setData] = React.useState<LeaderboardPage>(initialData);
  const [loading, setLoading] = React.useState(false);

  const isInitialRender = React.useRef(true);

  React.useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);

    axios
      .get<LeaderboardPage>("/api/leaderboard", { params: { topic: topic ?? undefined, page } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [topic, page]);

  const handleTopicChange = (nextTopic: string | null) => {
    setTopic(nextTopic);
    setPage(1);
  };

  const currentUserVisible = data.entries.some((entry) => entry.rank === data.currentUserRank);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => handleTopicChange(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
            topic === null
              ? "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500/50 dark:bg-violet-500/15 dark:text-violet-300"
              : "border-slate-200 bg-white/60 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          )}
        >
          {t("global")}
        </button>

        {topics.map((t2) => (
          <button
            key={t2.topic}
            type="button"
            onClick={() => handleTopicChange(t2.topic)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              topic === t2.topic
                ? "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500/50 dark:bg-violet-500/15 dark:text-violet-300"
                : "border-slate-200 bg-white/60 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            )}
          >
            {t2.topic}
          </button>
        ))}
      </div>

      {!currentUserVisible && data.currentUserRank !== null && (
        <div className="mb-4 rounded-2xl border border-violet-200/60 bg-violet-50/60 px-4 py-3 text-center text-sm font-semibold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
          {t("yourRank", { rank: data.currentUserRank })}
        </div>
      )}

      {data.currentUserRank === null && (
        <div className="mb-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          {topic ? t("notRankedTopic") : t("notRankedGlobal")}
        </div>
      )}

      <div className="relative rounded-[1.75rem] border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.75rem] bg-white/60 backdrop-blur-sm dark:bg-slate-950/60">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        )}

        {data.entries.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {data.entries.map((entry) => {
              const isCurrentUser = entry.rank === data.currentUserRank;
              return (
                <li
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 sm:px-5",
                    isCurrentUser && "bg-violet-50/60 dark:bg-violet-500/10"
                  )}
                >
                  <div className="flex w-8 shrink-0 items-center justify-center">
                    {entry.rank <= 3 ? (
                      <Crown
                        className={cn(
                          "h-4 w-4",
                          entry.rank === 1 && "text-amber-400",
                          entry.rank === 2 && "text-slate-400",
                          entry.rank === 3 && "text-orange-400"
                        )}
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-400">{entry.rank}</span>
                    )}
                  </div>

                  <Avatar className="h-9 w-9">
                    {entry.image && <AvatarImage src={entry.image} alt={entry.name} />}
                    <AvatarFallback>{entry.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {entry.name}
                      {isCurrentUser && <span className="ml-1.5 text-xs text-violet-500">{t("you")}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {topic
                        ? t("quizzesPlayed", { count: entry.secondaryValue })
                        : t("levelLabel", { level: entry.secondaryValue })}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-foreground">
                      {topic ? t("correctCount", { count: entry.primaryValue }) : `${entry.primaryValue} XP`}
                    </p>
                  </div>

                  {currentUserId && entry.userId !== currentUserId && (
                    <AddFriendCell
                      targetUserId={entry.userId}
                      isFriend={friendUserIds.includes(entry.userId)}
                      isPending={pendingUserIds.includes(entry.userId)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-xl"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t("pageOf", { page: data.page, totalPages: data.totalPages })}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= data.totalPages || loading}
          onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
          className="rounded-xl"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
