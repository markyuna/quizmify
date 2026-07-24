"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useToast } from "./ui/use-toast";

export default function IdleLogoutNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("IdleTimeout");

  useEffect(() => {
    if (searchParams.get("reason") !== "idle") return;

    toast({
      title: t("loggedOutTitle"),
      description: t("loggedOutBody"),
    });

    // Strip the query param so refreshing the login page doesn't re-toast.
    router.replace("/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
