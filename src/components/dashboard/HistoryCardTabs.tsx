"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CardDescription, CardTitle } from "@/components/ui/card";
import TabBar from "@/components/TabBar";

type Props = {
  title: string;
  quizzesLabel: string;
  neuronsLabel: string;
  description: string;
  neuronsDescription: string;
  quizzesPanel: React.ReactNode;
  neuronsPanel: React.ReactNode;
};

/**
 * In-place tab toggle for the dashboard history card. Defaults to the
 * Quizzes preview; the title arrow always points at the matching tab of
 * the full /history page. Both panels are server-rendered and handed in
 * as slots so switching costs nothing.
 */
export default function HistoryCardTabs({
  title,
  quizzesLabel,
  neuronsLabel,
  description,
  neuronsDescription,
  quizzesPanel,
  neuronsPanel,
}: Props) {
  const [tab, setTab] = React.useState<"quizzes" | "neurons">("quizzes");

  return (
    <div className="space-y-3">
      <div className="min-w-0 space-y-2">
        <CardTitle className="text-lg font-bold sm:text-xl">
          <Link
            href={tab === "neurons" ? "/history?tab=neurons" : "/history?tab=quizzes"}
            className="inline-flex items-center gap-2 hover:opacity-80"
          >
            {title}
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </CardTitle>

        <CardDescription className="text-sm leading-6">
          {tab === "quizzes" ? description : neuronsDescription}
        </CardDescription>

        <TabBar
          size="sm"
          activeKey={tab}
          items={[
            { key: "quizzes", label: quizzesLabel, onClick: () => setTab("quizzes") },
            { key: "neurons", label: neuronsLabel, onClick: () => setTab("neurons") },
          ]}
        />
      </div>

      {tab === "quizzes" ? quizzesPanel : neuronsPanel}
    </div>
  );
}
