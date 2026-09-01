import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";

import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/i18n/get-locale";
import { cn } from "@/lib/utils";

// NeuronTransaction rows are at most one per eligible quiz submit (often
// zero -- only when a fresh batch of 10 completes), plus rare unlock/bonus
// rows, so real volume stays low. Still paginated so a multi-year account
// never pulls an unbounded list.
const PAGE_SIZE = 20;

type Props = {
  userId: string;
  page: number;
  // Builds the href for a given page number. Passed in so the list can
  // live under whatever route hosts it (/history?tab=neurons&page=N)
  // without hard-coding the path here.
  hrefForPage: (page: number) => string;
};

const TYPE_LABEL_KEY: Record<string, string> = {
  earn_quiz: "typeEarnQuiz",
  spend_unlock: "typeSpendUnlock",
  bonus_personality: "typeBonusPersonality",
  spend_morpion: "typeSpendMorpion",
  purchase: "typePurchase",
};

export default async function NeuronHistoryList({
  userId,
  page: requestedPage,
  hrefForPage,
}: Props) {
  const t = await getTranslations("NeuronHistory");
  const locale = await getRequestLocale();

  const total = await prisma.neuronTransaction.count({ where: { userId } });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamp so an out-of-range ?page= (e.g. a bookmarked deep link after the
  // ledger shrank, or a hand-typed value) lands on the last real page
  // instead of an empty list with a live "Previous" button.
  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.neuronTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      type: true,
      amount: true,
      gameKey: true,
      relatedGameId: true,
      createdAt: true,
    },
  });

  // relatedGameId is a plain traceability string, not a Prisma relation
  // (schema.prisma: relationMode="prisma", "not a join target") -- resolve
  // the related quiz topics with one extra batched query, not an include.
  const relatedIds = [
    ...new Set(
      rows.map((r) => r.relatedGameId).filter((v): v is string => !!v)
    ),
  ];
  const relatedGames = relatedIds.length
    ? await prisma.game.findMany({
        where: { id: { in: relatedIds }, userId },
        select: { id: true, topic: true },
      })
    : [];
  const topicByGameId = new Map(relatedGames.map((g) => [g.id, g.topic]));

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((row) => {
          const isCredit = row.amount >= 0;
          const label = t(TYPE_LABEL_KEY[row.type] ?? "typeEarnQuiz");
          const isEarnQuiz = row.type === "earn_quiz";
          const topic =
            isEarnQuiz && row.relatedGameId
              ? topicByGameId.get(row.relatedGameId) ?? null
              : null;
          const relatedMissing = isEarnQuiz && !!row.relatedGameId && !topic;

          return (
            <li
              key={row.id}
              className="flex items-start gap-3 rounded-2xl border border-border/50 p-3"
            >
              <div
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
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
                  {label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <span>{dateFmt.format(row.createdAt)}</span>
                  {topic && <span> &middot; {t("fromQuiz", { topic })}</span>}
                  {relatedMissing && <span> &middot; {t("quizUnavailable")}</span>}
                  {row.type === "spend_unlock" && row.gameKey && (
                    <span> &middot; {row.gameKey}</span>
                  )}
                </p>
                {isEarnQuiz && (
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/70">
                    {t("earnQuizNote")}
                  </p>
                )}
              </div>

              <p
                className={cn(
                  "mt-0.5 shrink-0 text-sm font-bold tabular-nums",
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2 text-sm">
          {page > 1 ? (
            <Link
              href={hrefForPage(page - 1)}
              className="rounded-lg border border-border/60 px-3 py-1.5 font-medium hover:bg-muted/50"
            >
              {t("previous")}
            </Link>
          ) : (
            <span className="rounded-lg border border-border/40 px-3 py-1.5 font-medium text-muted-foreground/40">
              {t("previous")}
            </span>
          )}

          <span className="text-xs text-muted-foreground">
            {t("pageOf", { page, total: totalPages })}
          </span>

          {page < totalPages ? (
            <Link
              href={hrefForPage(page + 1)}
              className="rounded-lg border border-border/60 px-3 py-1.5 font-medium hover:bg-muted/50"
            >
              {t("next")}
            </Link>
          ) : (
            <span className="rounded-lg border border-border/40 px-3 py-1.5 font-medium text-muted-foreground/40">
              {t("next")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
