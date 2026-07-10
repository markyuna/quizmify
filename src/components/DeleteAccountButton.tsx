"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("Account");

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOut({ callbackUrl: "/" });
    } catch {
      setLoading(false);
      toast({
        title: t("somethingWentWrong"),
        description: t("couldNotDelete"),
        variant: "destructive",
      });
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="destructive"
        size="sm"
        className="mt-3"
        onClick={() => setConfirming(true)}
      >
        {t("deleteMyAccount")}
      </Button>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-sm text-rose-700 dark:text-rose-400">
        {t("areYouSure")}
      </span>
      <Button
        variant="destructive"
        size="sm"
        disabled={loading}
        onClick={handleDelete}
      >
        {loading ? t("deleting") : t("yesDeleteEverything")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => setConfirming(false)}
      >
        {t("cancel")}
      </Button>
    </div>
  );
}
