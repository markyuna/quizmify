"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = { isPro: boolean };

/**
 * Hover/tap hint on the dashboard Neurons counter, explaining how the
 * balance is earned. Purely informational -- the separate "see history"
 * text link next to the counter is the navigation affordance, not this
 * icon. TooltipProvider lives in the root layout.
 */
export default function NeuronsInfoTooltip({ isPro }: Props) {
  const t = useTranslations("NeuronHistory");

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={t("whatIsThis")}
        className="inline-flex text-muted-foreground outline-none transition hover:text-slate-700 focus-visible:text-slate-700 dark:hover:text-slate-200 dark:focus-visible:text-slate-200"
      >
        <Info className="h-3.5 w-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px] text-left font-medium leading-snug">
        <p>{t("howItWorks")}</p>
        {isPro && <p className="mt-1 text-muted-foreground">{t("howItWorksPro")}</p>}
      </TooltipContent>
    </Tooltip>
  );
}
