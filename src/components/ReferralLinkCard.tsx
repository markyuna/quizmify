"use client";

import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";

import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";

export default function ReferralLinkCard({ referralLink }: { referralLink: string }) {
  const t = useTranslations("Referrals");
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    toast({ title: t("linkCopied") });
  };

  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("linkLabel")}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={referralLink}
          className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
        />
        <Button size="sm" onClick={handleCopy} className="shrink-0 rounded-xl">
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          {t("copyLink")}
        </Button>
      </div>
    </div>
  );
}
