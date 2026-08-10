"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import WordOfDayCard from "@/components/games/WordOfDayCard";
import PhotoOfDayCard from "@/components/games/PhotoOfDayCard";
import MathTargetCard from "@/components/games/MathTargetCard";
import { cn } from "@/lib/utils";

type GameKey = "word-of-day" | "photo-of-day" | "math-target";

const GAMES: Array<{ key: GameKey; titleKey: string; teaserKey: string }> = [
  { key: "word-of-day", titleKey: "games.wordOfDay.title", teaserKey: "games.wordOfDay.teaser" },
  { key: "photo-of-day", titleKey: "games.photoOfDay.title", teaserKey: "games.photoOfDay.teaser" },
  { key: "math-target", titleKey: "games.mathTarget.title", teaserKey: "games.mathTarget.teaser" },
];

function isGameKey(value: string | null): value is GameKey {
  return GAMES.some((game) => game.key === value);
}

function GameRenderer({ gameKey, isAuthenticated }: { gameKey: GameKey; isAuthenticated: boolean }) {
  switch (gameKey) {
    case "word-of-day":
      return <WordOfDayCard isAuthenticated={isAuthenticated} />;
    case "photo-of-day":
      return <PhotoOfDayCard isAuthenticated={isAuthenticated} />;
    case "math-target":
      return <MathTargetCard isAuthenticated={isAuthenticated} />;
    default:
      return null;
  }
}

function GamesContent() {
  const t = useTranslations("GuestGames");
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const searchParams = useSearchParams();
  const gameParam = searchParams.get("game");
  const [selectedGame, setSelectedGame] = useState<GameKey>(isGameKey(gameParam) ? gameParam : "word-of-day");

  const selectedGameData = GAMES.find((game) => game.key === selectedGame) ?? GAMES[0];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {/* Left column: game list */}
        <div className="md:col-span-1">
          <div className="sticky top-6 space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("carouselTitle")}
            </h3>

            {GAMES.map((game) => (
              <button
                key={game.key}
                type="button"
                onClick={() => setSelectedGame(game.key)}
                className={cn(
                  "block w-full rounded-lg px-4 py-3 text-left transition",
                  selectedGame === game.key
                    ? "bg-violet-600 font-semibold text-white"
                    : "text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10"
                )}
              >
                → {t(game.titleKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Right column: the selected game */}
        <div className="md:col-span-2 lg:col-span-3">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              {t(selectedGameData.titleKey)}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t(selectedGameData.teaserKey)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <GameRenderer gameKey={selectedGame} isAuthenticated={isAuthenticated} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GamesPage() {
  return (
    <Suspense>
      <GamesContent />
    </Suspense>
  );
}
