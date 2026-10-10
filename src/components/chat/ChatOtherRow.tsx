"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import type { ChatOtherContact } from "@/lib/chat";
import { parseChatError } from "@/lib/chatErrors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAcceptFriendRequest, useSendFriendRequest } from "@/hooks/chat/useChatMutations";

/** A non-friend: shortened public name, never any presence. */
export default function ChatOtherRow({ contact }: { contact: ChatOtherContact }) {
  const t = useTranslations("Chat");
  const { toast } = useToast();
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const name = contact.name ?? t("anonymousPlayer");

  const showError = (error: unknown) => {
    const parsed = parseChatError(error);
    toast({ title: t(parsed.key, parsed.values), variant: "destructive" });
  };

  const onAdd = () =>
    sendRequest.mutate(contact.userId, {
      onSuccess: (outcome) =>
        toast({
          title:
            outcome === "auto_accepted" || outcome === "already_friends"
              ? t("nowFriendsToast", { name })
              : t("friendRequestSentToast"),
        }),
      onError: showError,
    });

  const onAccept = () => {
    if (!contact.friendshipId) return;
    acceptRequest.mutate(contact.friendshipId, {
      onSuccess: () => toast({ title: t("nowFriendsToast", { name }) }),
      onError: showError,
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
      <Avatar className="h-10 w-10 shrink-0">
        {contact.image && <AvatarImage src={contact.image} alt="" />}
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
        {contact.relation === "pending_received" && (
          <p className="truncate text-xs text-violet-600 dark:text-violet-300">{t("requestReceived")}</p>
        )}
      </div>

      {contact.relation === "none" && (
        <Button
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl"
          onClick={onAdd}
          disabled={sendRequest.isPending}
          aria-label={t("addFriend", { name })}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
      {contact.relation === "pending_sent" && (
        <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{t("requestSent")}</span>
      )}
      {contact.relation === "pending_received" && (
        <Button
          size="sm"
          className="shrink-0"
          onClick={onAccept}
          disabled={acceptRequest.isPending || !contact.friendshipId}
        >
          {t("accept")}
        </Button>
      )}
    </div>
  );
}
