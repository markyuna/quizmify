import { Trophy as TrophyIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";

import TrophyGrid from "./TrophyGrid";

export default async function TrophyCabinetCard({ userId }: { userId: string }) {
  const t = await getTranslations("TrophyCabinet");

  const [trophies, trophyCount] = await Promise.all([
    prisma.trophy.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        kind: true,
        streakCount: true,
        createdAt: true,
        game: { select: { topic: true } },
      },
    }),
    prisma.trophy.count({ where: { userId } }),
  ]);

  const items = trophies.map((trophy) => ({
    id: trophy.id,
    kind: trophy.kind,
    streakCount: trophy.streakCount,
    createdAt: trophy.createdAt,
    topic: trophy.game?.topic ?? null,
  }));

  return (
    <Card className="relative h-full overflow-hidden rounded-[1.75rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.01] dark:bg-white/5 sm:rounded-[1.75rem]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />

      <CardHeader className="relative z-10 p-4 pb-3 sm:p-6 sm:pb-4">
        <div className="space-y-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5 sm:text-xs">
            <TrophyIcon className="h-3.5 w-3.5 text-amber-400" />
            {t("badge")}
          </div>

          <div className="min-w-0">
            <CardTitle className="text-lg font-bold sm:text-xl">
              {t("title")}
            </CardTitle>
            <CardDescription className="text-sm leading-6">
              {trophyCount === 1 ? t("countSingular") : t("countPlural", { count: trophyCount })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-4 pt-0 sm:p-6 sm:pt-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-dashed border-white/20 bg-white/40 px-4 py-8 text-center dark:bg-white/5">
            <TrophyIcon className="h-8 w-8 text-amber-300" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("emptyTitle")}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {t("emptySubtitle")}
            </p>
          </div>
        ) : (
          <TrophyGrid trophies={items} />
        )}
      </CardContent>
    </Card>
  );
}
