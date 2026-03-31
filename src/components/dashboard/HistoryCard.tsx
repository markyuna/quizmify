import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { History, ArrowRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import HistoryComponent from "../HistoryComponent";
import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";

const HistoryCard = async () => {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/");
  }

  const attemptsCount = await prisma.attempt.count({
    where: {
      userId,
    },
  });

  return (
    <Card className="relative h-full overflow-hidden rounded-[1.5rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.01] dark:bg-white/5 sm:rounded-[1.75rem]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />

      <CardHeader className="relative z-10 p-4 pb-3 sm:p-6 sm:pb-4">
        <div className="space-y-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5 sm:text-xs">
            <History className="h-3.5 w-3.5 text-emerald-400" />
            History
          </div>

          <div className="min-w-0">
            <CardTitle className="text-lg font-bold sm:text-xl">
              <Link
                href="/history"
                className="inline-flex items-center gap-2 hover:opacity-80"
              >
                Quiz History
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </CardTitle>

            <CardDescription className="text-sm leading-6">
              {attemptsCount}{" "}
              {attemptsCount === 1 ? "attempt" : "attempts"} recorded
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="min-w-0 rounded-[1.25rem] border border-white/10 bg-white/40 p-2 backdrop-blur-xl dark:bg-white/5 sm:rounded-[1.5rem] sm:p-3">
          <div className="min-w-0 rounded-[1rem] sm:rounded-[1.25rem] lg:max-h-[300px] lg:overflow-y-auto lg:pr-1">
            <HistoryComponent limit={6} userId={userId} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoryCard;