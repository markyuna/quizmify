"use client";

import React from "react";
import Link from "next/link";
import {
  Brain,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Shuffle,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent } from "../ui/card";
import { cn } from "@/lib/utils";

type QuizMeCardProps = {
  lastTopic?: string | null;
  hasMistakes?: boolean;
};

const TOPICS = [
  "JavaScript",
  "History",
  "Biology",
  "Geography",
  "Math",
  "Science",
  "Python",
  "HTML",
];

const DEFAULT_TOPIC = "JavaScript";

const QuizMeCard = ({
  lastTopic = null,
  hasMistakes = false,
}: QuizMeCardProps) => {
  const [randomTopic, setRandomTopic] = React.useState(DEFAULT_TOPIC);

  React.useEffect(() => {
    const nextTopic =
      TOPICS[Math.floor(Math.random() * TOPICS.length)] ?? DEFAULT_TOPIC;
    setRandomTopic(nextTopic);
  }, []);

  const actions = [
    {
      title: "New quiz",
      description: "Start a fresh quiz",
      href: "/quiz",
      icon: PlusCircle,
      disabled: false,
    },
    {
      title: "Random topic",
      description: randomTopic,
      href: `/quiz?topic=${encodeURIComponent(randomTopic)}`,
      icon: Shuffle,
      disabled: false,
    },
    {
      title: "Repeat last topic",
      description: lastTopic ?? "Not available yet",
      href: lastTopic ? `/quiz?topic=${encodeURIComponent(lastTopic)}` : "/quiz",
      icon: RotateCcw,
      disabled: !lastTopic,
    },
    {
      title: "Practice mistakes",
      description: hasMistakes
        ? "Review your incorrect answers"
        : "No mistakes saved yet",
      href: hasMistakes ? "/quiz/mistakes" : "/quiz",
      icon: AlertCircle,
      disabled: !hasMistakes,
    },
  ];

  return (
    <Card className="group relative h-full max-h-[420px] overflow-hidden rounded-[1.75rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.01] dark:bg-white/5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-cyan-500/15 opacity-80" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />

      <CardContent className="relative z-10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              AI powered
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight">Quiz me</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Use quick actions to start a new quiz, explore random topics,
                revisit previous subjects, and strengthen weak areas.
              </p>
            </div>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/60 shadow-sm backdrop-blur-xl dark:bg-white/5">
            <Brain className="h-5 w-5 text-violet-500 dark:text-violet-300" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.title}
                href={action.href}
                aria-disabled={action.disabled}
                className={cn(
                  "rounded-2xl border border-white/10 bg-white/50 p-4 backdrop-blur-xl transition-all duration-200 dark:bg-white/5",
                  action.disabled
                    ? "pointer-events-none opacity-50"
                    : "hover:-translate-y-0.5 hover:bg-white/70 dark:hover:bg-white/10"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/60 dark:bg-white/5">
                      <Icon className="h-5 w-5 text-violet-500 dark:text-violet-300" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {action.title}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-foreground/60" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizMeCard;