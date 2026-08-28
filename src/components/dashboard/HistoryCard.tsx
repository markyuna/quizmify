import React from "react";
import { History } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader } from "../ui/card";
import HistoryComponent, { type AttemptItem } from "../HistoryComponent";
import HistoryCardTabs from "./HistoryCardTabs";
import NeuronPreview from "./NeuronPreview";

type HistoryCardProps = {
  userId: string;
  attemptsCount: number;
  attempts?: AttemptItem[];
};

const panelBoxClass =
  "min-w-0 rounded-[1.25rem] border border-white/10 bg-white/40 p-2 backdrop-blur-xl dark:bg-white/5 sm:rounded-[1.5rem] sm:p-3";
const panelScrollClass =
  "min-w-0 rounded-[1rem] sm:rounded-[1.25rem] lg:max-h-[300px] lg:overflow-y-auto lg:pr-1";

const HistoryCard = async ({ userId, attemptsCount, attempts }: HistoryCardProps) => {
  const t = await getTranslations("HistoryCard");
  const tHistoryPage = await getTranslations("HistoryPage");

  return (
    <Card className="relative h-full overflow-hidden rounded-[1.5rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.01] dark:bg-white/5 sm:rounded-[1.75rem]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />

      <CardHeader className="relative z-10 p-4 pb-3 sm:p-6 sm:pb-4">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5 sm:text-xs">
          <History className="h-3.5 w-3.5 text-emerald-400" />
          {t("badge")}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-4 pt-0 sm:p-6 sm:pt-0">
        <HistoryCardTabs
          title={t("quizHistory")}
          quizzesLabel={tHistoryPage("tabQuizzes")}
          neuronsLabel={tHistoryPage("tabNeurons")}
          description={`${attemptsCount} ${
            attemptsCount === 1 ? t("attempt") : t("attempts")
          } ${t("recorded")}`}
          quizzesPanel={
            <div className={panelBoxClass}>
              <div className={panelScrollClass}>
                <HistoryComponent limit={6} userId={userId} data={attempts} />
              </div>
            </div>
          }
          neuronsPanel={
            <div className={panelBoxClass}>
              <div className={panelScrollClass}>
                <NeuronPreview userId={userId} />
              </div>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
};

export default HistoryCard;
