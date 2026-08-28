import { getTranslations } from "next-intl/server";
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";

import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/i18n/get-locale";
import { cn } from "@/lib/utils";

// Just a glance at the latest ledger activity for the dashboard card --
// deliberately its own tiny query, NOT NeuronHistoryList's paginated one.
const PREVIEW_COUNT = 3;

const TYPE_LABEL_KEY: Record<string, string> = {
  earn_quiz: "typeEarnQuiz",
  spend_unlock: "typeSpendUnlock",
  bonus_personality: "typeBonusPersonality",
};

export default async function NeuronPreview({ userId }: { userId: string }) {
  const t = await getTranslations("NeuronHistory");
  const locale = await getRequestLocale();

  const rows = await prisma.neuronTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: PREVIEW_COUNT,
    select: { id: true, type: true, amount: true, createdAt: true },
  });

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <ul className="min-w-0 space-y-2">
      {rows.map((row) => {
        const isCredit = row.amount >= 0;

        return (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-2xl border border-border/50 p-3"
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                isCredit
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
              )}
            >
              {row.type === "bonus_personality" ? (
                <Sparkles className="h-4 w-4" />
              ) : isCredit ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {t(TYPE_LABEL_KEY[row.type] ?? "typeEarnQuiz")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {dateFmt.format(row.createdAt)}
              </p>
            </div>

            <p
              className={cn(
                "shrink-0 text-sm font-bold tabular-nums",
                isCredit
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {isCredit ? "+" : "−"}
              {Math.abs(row.amount)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
