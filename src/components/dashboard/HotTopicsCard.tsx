import { Flame, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";

import HotTopicsCloud from "./HotTopicsCloud";

export default async function HotTopicsCard() {
  const topics = await prisma.game.groupBy({
    by: ["topic"],
    _count: {
      topic: true,
    },
    orderBy: {
      _count: {
        topic: "desc",
      },
    },
  });

  const formattedTopics = topics
    .filter((topic) => topic.topic && topic.topic.trim() !== "")
    .map((topic) => ({
      text: topic.topic,
      value: topic._count.topic,
    }))
    .slice(0, 12);

  return (
    <Card className="relative h-full max-h-[420px] overflow-hidden rounded-[1.75rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.01] dark:bg-white/5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
      <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

      <CardHeader className="relative z-10 pb-4">
        <div className="space-y-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5">
            <Flame className="h-3.5 w-3.5 text-fuchsia-400" />
            Trending now
          </div>

          <div>
            <CardTitle className="text-xl font-bold">Hot Topics</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Most popular quiz topics.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-4 pt-0">
        {formattedTopics.length > 0 ? (
          <div className="rounded-[1.5rem] border border-white/10 bg-white/40 p-3 backdrop-blur-xl dark:bg-white/5">
            <div className="min-h-[300px] rounded-[1.25rem]">
              <HotTopicsCloud formattedTopics={formattedTopics} />
            </div>
          </div>
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/40 p-6 text-center backdrop-blur-xl dark:bg-white/5">
            <div className="space-y-2">
              <Sparkles className="mx-auto h-5 w-5 text-violet-400" />
              <p className="text-sm font-semibold">No topics yet</p>
              <p className="text-sm text-muted-foreground">
                Complete quizzes to unlock trends.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}