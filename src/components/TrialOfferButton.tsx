"use client";

import * as React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";

export default function TrialOfferButton({ days, className }: { days: number; className?: string }) {
  const t = useTranslations("Trial");
  const router = useRouter();
  const { toast } = useToast();

  const { mutate: activate, isPending, isSuccess } = useMutation({
    mutationFn: async () => axios.post("/api/trial/activate"),
    onSuccess: () => {
      toast({ title: t("activated", { days }) });
      router.refresh();
    },
    onError: () => toast({ title: t("error"), variant: "destructive" }),
  });

  return (
    <Button onClick={() => activate()} disabled={isPending || isSuccess} className={className}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {isSuccess ? t("activated", { days }) : t("startTrial", { days })}
    </Button>
  );
}
