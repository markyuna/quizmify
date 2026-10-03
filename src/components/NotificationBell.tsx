"use client";

import * as React from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Bell, Check, Sparkles, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useToast } from "./ui/use-toast";
import { formatRelativeTime } from "@/lib/relativeTime";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import type { NotificationsPage } from "@/lib/inAppNotifications";
// PRO_OFFER_REWARD_DAYS from the pure constants module, never from
// @/lib/proOffers -- that one imports `{ prisma } from "@/lib/db"` and must
// never be reachable from a "use client" component.
import { PRO_OFFER_REWARD_DAYS } from "@/lib/proOfferConstants";

type Props = {
  initialUnreadCount: number;
};

const itemButtonClass =
  "h-7 flex-1 cursor-pointer justify-center gap-1 rounded-lg px-2.5 py-0 text-xs font-semibold outline-none transition-all duration-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export default function NotificationBell({ initialUnreadCount }: Props) {
  const t = useTranslations("Notifications");
  const tFriends = useTranslations("Friends");
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const { data: countData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => (await axios.get<{ count: number }>("/api/notifications/unread-count")).data,
    initialData: { count: initialUnreadCount },
    refetchInterval: 30_000,
    // Overrides QueryProvider.tsx's global refetchOnWindowFocus: false --
    // this is small, always-mounted chrome, so refreshing the count right
    // when someone tabs back in is worth the extra request. FriendsManager's
    // polling query deliberately stayed opt-out of this; this is the one
    // intentional exception. refetchIntervalInBackground is left at its
    // default (false), so it still pauses while the tab is hidden.
    refetchOnWindowFocus: true,
  });
  const unreadCount = countData.count;

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await axios.get<NotificationsPage>("/api/notifications")).data,
    enabled: open,
  });
  const notifications = notificationsData?.notifications ?? [];
  // Fallback only matters before the list has ever loaded (dropdown never
  // opened yet), when there's nothing to render anyway -- once `open` has
  // fired the query once, this is always the real server clock.
  const serverNow = notificationsData?.serverNow ?? new Date().toISOString();

  const { mutate: markRead } = useMutation({
    mutationFn: async () => axios.post("/api/notifications/read"),
    onSettled: () => {
      // Guards against the 30s poll (or this mutation's own race with it)
      // reporting a stale pre-read count right after this resolves.
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const {
    mutate: respond,
    isPending: isResponding,
    variables: respondingVariables,
  } = useMutation({
    mutationFn: async ({ friendshipId, action }: { friendshipId: string; action: "accept" | "decline" }) =>
      axios.patch(`/api/friends/${friendshipId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends-overview"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error, variables) => {
      // 404: the friendship row is gone (cancelled/already resolved
      // elsewhere). 409: still exists but no longer "pending" (see the
      // guard in src/app/api/friends/[friendshipId]/route.ts) -- same
      // user-facing outcome either way, the request this item refers to
      // can't be acted on anymore.
      if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 409)) {
        queryClient.setQueryData<NotificationsPage | undefined>(["notifications"], (old) =>
          old
            ? { ...old, notifications: old.notifications.filter((n) => n.friendshipId !== variables.friendshipId) }
            : old
        );
        queryClient.invalidateQueries({ queryKey: ["friends-overview"] });
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
        toast({ title: t("requestGone") });
        return;
      }
      toast({ title: t("error"), variant: "destructive" });
    },
  });

  const {
    mutate: respondToOffer,
    isPending: isRespondingToOffer,
    variables: offerVariables,
  } = useMutation({
    mutationFn: async ({ notificationId, action }: { notificationId: string; action: "accept" | "ignore" }) =>
      axios.post<{ rewardDays?: number }>(`/api/referrals/offers/${notificationId}/${action}`),
    onSuccess: (res, variables) => {
      if (variables.action === "accept" && typeof res.data.rewardDays === "number") {
        toast({ title: t("proOfferAcceptedToast", { days: res.data.rewardDays }) });
      }
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      // Relevant when the person accepting is also mid-browsing their own
      // outgoing invites; harmless no-op otherwise.
      queryClient.invalidateQueries({ queryKey: ["pro-offer-candidates"] });
    },
    onError: (error, variables) => {
      // Same 404/409 stance as friend requests: the offer is gone (ignored
      // from another tab) or already resolved (already_referred) -- either
      // way, drop it from the list.
      if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 409)) {
        queryClient.setQueryData<NotificationsPage | undefined>(["notifications"], (old) =>
          old ? { ...old, notifications: old.notifications.filter((n) => n.id !== variables.notificationId) } : old
        );
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
        toast({ title: t("requestGone") });
        return;
      }
      toast({ title: t("error"), variant: "destructive" });
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && unreadCount > 0) {
      // Optimistic: reset the badge immediately instead of waiting for the
      // POST round-trip or the next 30s poll.
      queryClient.setQueryData(["notifications-unread-count"], { count: 0 });
      markRead();
    }
  };

  // Server already excludes dismissed rows (listNotifications filters
  // dismissedAt: null) -- no client-side type filter needed anymore.
  const visibleNotifications = notifications;

  return (
    // modal={false}: same reasoning as PrimaryNav.tsx/UserAccountNav.tsx --
    // avoid react-remove-scroll's body-scroll lock shifting the layout.
    <DropdownMenu modal={false} open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("ariaLabel", { count: unreadCount })}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/70 backdrop-blur-md shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md dark:border-white/10 dark:bg-white/10 md:h-11 md:w-11"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-80 max-w-[90vw] rounded-3xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85"
      >
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("title")}
        </p>

        <div className="max-h-96 overflow-y-auto">
          {visibleNotifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            visibleNotifications.map((n) => {
              const isThisPending = isResponding && respondingVariables?.friendshipId === n.friendshipId;
              const isThisOfferPending = isRespondingToOffer && offerVariables?.notificationId === n.id;

              return (
                <div key={n.id} className="flex items-start gap-2.5 rounded-2xl px-3 py-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    {n.actorImage && <AvatarImage src={n.actorImage} alt={n.actorName} />}
                    <AvatarFallback>{n.actorName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      {n.type === "friend_request_received" && t("friendRequestReceived", { name: n.actorName })}
                      {n.type === "friend_request_accepted" && t("friendRequestAccepted", { name: n.actorName })}
                      {n.type === "referral_offer" &&
                        t("proOfferReceived", { name: n.actorName, days: PRO_OFFER_REWARD_DAYS })}
                      {n.type === "referral_offer_accepted" &&
                        t("proOfferAccepted", { name: n.actorName, days: PRO_OFFER_REWARD_DAYS })}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatRelativeTime(n.createdAt, serverNow, locale)}
                    </p>

                    {/* Plain <Button>s here are unreachable by keyboard: Radix's
                        DropdownMenuContent prevents the native Tab key entirely
                        (@radix-ui/react-menu, onKeyDown: if (event.key === "Tab")
                        event.preventDefault()) and only RovingFocusGroup.Item --
                        i.e. DropdownMenuItem -- participates in arrow-key
                        navigation. onSelect's preventDefault keeps the menu open
                        on click/Enter/Space so Accept/Decline don't close it. */}
                    {n.type === "friend_request_received" && n.friendshipId && (
                      <div className="mt-2 flex gap-1.5">
                        <DropdownMenuItem
                          disabled={isThisPending}
                          onSelect={(event) => {
                            event.preventDefault();
                            respond({ friendshipId: n.friendshipId as string, action: "accept" });
                          }}
                          className={`${itemButtonClass} bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {tFriends("accept")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isThisPending}
                          onSelect={(event) => {
                            event.preventDefault();
                            respond({ friendshipId: n.friendshipId as string, action: "decline" });
                          }}
                          className={`${itemButtonClass} border border-slate-200 text-foreground/90 dark:border-white/10`}
                        >
                          <X className="h-3.5 w-3.5" />
                          {tFriends("decline")}
                        </DropdownMenuItem>
                      </div>
                    )}

                    {n.type === "referral_offer" && (
                      <div className="mt-2 flex gap-1.5">
                        <DropdownMenuItem
                          disabled={isThisOfferPending}
                          onSelect={(event) => {
                            event.preventDefault();
                            respondToOffer({ notificationId: n.id, action: "accept" });
                          }}
                          className={`${itemButtonClass} bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {t("accept")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isThisOfferPending}
                          onSelect={(event) => {
                            event.preventDefault();
                            respondToOffer({ notificationId: n.id, action: "ignore" });
                          }}
                          className={`${itemButtonClass} border border-slate-200 text-foreground/90 dark:border-white/10`}
                        >
                          <X className="h-3.5 w-3.5" />
                          {t("ignore")}
                        </DropdownMenuItem>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
