"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, UserPlus } from "lucide-react";

import { Button, buttonVariants } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";

type AddFriendButtonProps = {
  targetUserId: string;
  currentUserId: string;
};

export default function AddFriendButton({ targetUserId, currentUserId }: AddFriendButtonProps) {
  const t = useTranslations("Friends");
  const { toast } = useToast();
  const isSelf = targetUserId === currentUserId;

  const { mutate: sendRequest, isPending, isSuccess, data } = useMutation({
    mutationFn: async () => {
      const res = await axios.post<{ outcome: string }>("/api/friends", { targetUserId });
      return res.data;
    },
    onError: () => toast({ title: t("error"), variant: "destructive" }),
  });

  if (isSelf) {
    return <p className="mt-4 text-sm text-slate-400">{t("cantAddSelf")}</p>;
  }

  if (isSuccess) {
    const message =
      data.outcome === "already_friends"
        ? t("alreadyFriends")
        : data.outcome === "already_pending"
        ? t("alreadyPending")
        : t("friendRequestSent");

    return (
      <div className="mt-4 flex flex-col items-center gap-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          {message}
        </p>
        <Link href="/friends" className={cn(buttonVariants({ variant: "outline" }), "rounded-2xl")}>
          {t("goToFriends")}
        </Link>
      </div>
    );
  }

  return (
    <Button onClick={() => sendRequest()} disabled={isPending} className="mt-4 rounded-2xl">
      <UserPlus className="mr-2 h-4 w-4" />
      {t("addFriendCta")}
    </Button>
  );
}
