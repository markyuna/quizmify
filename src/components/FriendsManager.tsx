"use client";

import * as React from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, Crown, Flame, UserMinus, UserPlus, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { isOnline } from "@/lib/presence";
import type { FriendsOverview } from "@/lib/friends";

type FriendsManagerProps = {
  initialOverview: FriendsOverview;
  inviteLink: string;
  currentUserId: string;
};

// No existing "time ago" helper in the repo (only date-fns' differenceInSeconds,
// used for quiz timers, not relative-past phrasing). Intl.RelativeTimeFormat
// already localizes the full phrase ("hace 5 minutos" / "il y a 5 minutes" /
// "5 minutes ago"), so Friends.lastSeenAgo only wraps it with a prefix rather
// than re-building it from parts. Only called when !isOnline, so diffMinutes
// is always >= 3 here (the 180s PRESENCE_ONLINE_WINDOW_MS already covers
// anything more recent).
function formatLastSeen(lastSeenAt: string, serverNow: string, locale: string): string {
  const diffMs = new Date(serverNow).getTime() - new Date(lastSeenAt).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffMinutes < 60) return rtf.format(-diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return rtf.format(-diffHours, "hour");
  return rtf.format(-Math.round(diffHours / 24), "day");
}

export default function FriendsManager({ initialOverview, inviteLink, currentUserId }: FriendsManagerProps) {
  const t = useTranslations("Friends");
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: overview } = useQuery({
    queryKey: ["friends-overview"],
    queryFn: async () => (await axios.get<FriendsOverview>("/api/friends")).data,
    initialData: initialOverview,
    // First polling query in the app (QueryProvider.tsx sets
    // refetchOnWindowFocus: false globally and nothing else uses
    // refetchInterval). Needed so a friend's presence dot updates without a
    // manual refresh. refetchIntervalInBackground is left at its default
    // (false), so this pauses while the /friends tab isn't visible --
    // consistent with the "treat the shared prod DB with care" rule, same
    // spirit as PresenceProvider only heartbeating while visible.
    refetchInterval: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["friends-overview"] });

  const { mutate: respond } = useMutation({
    mutationFn: async ({ friendshipId, action }: { friendshipId: string; action: "accept" | "decline" }) =>
      axios.patch(`/api/friends/${friendshipId}`, { action }),
    onSuccess: invalidate,
    onError: () => toast({ title: t("error"), variant: "destructive" }),
  });

  const { mutate: removeFriendship } = useMutation({
    mutationFn: async (friendshipId: string) => axios.delete(`/api/friends/${friendshipId}`),
    onSuccess: invalidate,
    onError: () => toast({ title: t("error"), variant: "destructive" }),
  });

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    toast({ title: t("linkCopied") });
  };

  return (
    <div className="space-y-4">
      {/* Invite link */}
      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("inviteLinkLabel")}</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={inviteLink}
            className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          />
          <Button size="sm" onClick={handleCopyLink} className="shrink-0 rounded-xl">
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {t("copyLink")}
          </Button>
        </div>
      </div>

      {/* Incoming requests */}
      {overview.incomingRequests.length > 0 && (
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("incomingRequests")}
          </p>
          <div className="space-y-2">
            {overview.incomingRequests.map((req) => (
              <div key={req.friendshipId} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    {req.image && <AvatarImage src={req.image} alt={req.name} />}
                    <AvatarFallback>{req.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{req.name}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => respond({ friendshipId: req.friendshipId, action: "accept" })}
                    aria-label={t("accept")}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => respond({ friendshipId: req.friendshipId, action: "decline" })}
                    aria-label={t("decline")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing requests */}
      {overview.outgoingRequests.length > 0 && (
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("outgoingRequests")}
          </p>
          <div className="space-y-2">
            {overview.outgoingRequests.map((req) => (
              <div key={req.friendshipId} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    {req.image && <AvatarImage src={req.image} alt={req.name} />}
                    <AvatarFallback>{req.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{req.name}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 rounded-lg text-xs text-slate-500"
                  onClick={() => removeFriendship(req.friendshipId)}
                >
                  {t("cancel")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      {overview.friends.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center dark:border-white/10 dark:bg-white/5">
          <UserPlus className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("noFriendsYet")}</p>
          <p className="mt-1 text-xs text-slate-400">{t("noFriendsHint")}</p>
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {overview.friends.map((friend, index) => (
              <li key={friend.friendshipId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="flex w-8 shrink-0 items-center justify-center">
                  {index === 0 ? (
                    <Crown className="h-4 w-4 text-amber-400" />
                  ) : (
                    <span className="text-sm font-bold text-slate-400">{index + 1}</span>
                  )}
                </div>

                <div className="relative shrink-0">
                  <Avatar className="h-9 w-9">
                    {friend.image && <AvatarImage src={friend.image} alt={friend.name} />}
                    <AvatarFallback>{friend.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {friend.userId !== currentUserId &&
                    friend.lastSeenAt &&
                    isOnline(new Date(friend.lastSeenAt), new Date(overview.serverNow)) && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950"
                      />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {friend.name}
                    {friend.userId === currentUserId && <span className="ml-1.5 text-xs text-violet-500">{t("you")}</span>}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    {t("levelLabel", { level: friend.level })}
                    {friend.currentStreak > 0 && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-500">
                        <Flame className="h-3 w-3" />
                        {friend.currentStreak}
                      </span>
                    )}
                  </p>
                  {friend.userId !== currentUserId && friend.lastSeenAt && (
                    <p className="truncate text-[11px] text-muted-foreground/70">
                      {isOnline(new Date(friend.lastSeenAt), new Date(overview.serverNow))
                        ? t("online")
                        : t("lastSeenAgo", { time: formatLastSeen(friend.lastSeenAt, overview.serverNow, locale) })}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-foreground">{friend.xp} XP</p>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 rounded-lg text-slate-300 hover:text-rose-500"
                  onClick={() => removeFriendship(friend.friendshipId)}
                  aria-label={t("remove")}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
