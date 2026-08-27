"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import WordOfDayCard from "@/components/games/WordOfDayCard";
import WordOfDayGuide from "@/components/games/WordOfDayGuide";
import PhotoOfDayCard from "@/components/games/PhotoOfDayCard";
import MathTargetCard from "@/components/games/MathTargetCard";
import { GAMES_CATALOG, type GameKey } from "@/lib/games/catalog";
import { cn } from "@/lib/utils";

const QUIZ_SEARCH_BACKGROUND = "/images/games/quiz-search-bg.webp";

function isGameKey(value: string | null): value is GameKey {
  return GAMES_CATALOG.some((game) => game.key === value);
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
  const router = useRouter();

  const searchParams = useSearchParams();
  const gameParam = searchParams.get("game");
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(isGameKey(gameParam) ? gameParam : null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedGameData = selectedGame ? GAMES_CATALOG.find((game) => game.key === selectedGame) : undefined;

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const topic = searchQuery.trim();
    if (!topic) return;
    router.push(`/quiz?topic=${encodeURIComponent(topic)}`);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {/* Left column: game list */}
        <div className="md:col-span-1">
          <div className="sticky top-6 space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("carouselTitle")}
            </h3>

            {GAMES_CATALOG.map((game) => (
              <button
                key={game.key}
                type="button"
                onClick={() => setSelectedGame(game.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition",
                  selectedGame === game.key
                    ? "bg-violet-600 font-semibold text-white"
                    : "text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10"
                )}
              >
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                  {game.image ? (
                    <Image
                      src={game.image}
                      alt={t(game.titleKey)}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  ) : game.icon ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <game.icon className={cn("h-5 w-5", selectedGame === game.key ? "text-white" : "text-violet-600 dark:text-violet-400")} />
                    </div>
                  ) : null}
                </div>
                <span className="truncate">→ {t(game.titleKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: the selected game, or a quiz-topic search hero */}
        <div className="md:col-span-2 lg:col-span-3">
          {selectedGame && selectedGameData ? (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                  {t(selectedGameData.titleKey)}
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t(selectedGameData.teaserKey)}</p>
              </div>

              {selectedGame === "word-of-day" && <WordOfDayGuide />}

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <GameRenderer gameKey={selectedGame} isAuthenticated={isAuthenticated} />
              </div>
            </div>
          ) : (
            <div className="relative h-[500px] overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10">
              <div className="absolute inset-0 -z-10">
                <Image
                  src={QUIZ_SEARCH_BACKGROUND}
                  alt=""
                  fill
                  priority
                  className="object-cover opacity-30 dark:opacity-20"
                  sizes="(max-width: 768px) 100vw, 75vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/60 to-slate-900/80 dark:from-slate-950/50 dark:via-slate-950/70 dark:to-slate-950/90" />
              </div>

              <div className="relative flex h-full flex-col items-center justify-center px-6">
                <div className="w-full max-w-md space-y-6 text-center">
                  <div>
                    <h2 className="text-3xl font-black text-white sm:text-4xl">{t("quizSearchTitle")}</h2>
                    <p className="mt-3 text-sm text-slate-200 sm:text-base">{t("quizSearchSubtitle")}</p>
                  </div>

                  <form onSubmit={handleSearchSubmit} className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t("quizSearchPlaceholder")}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full rounded-xl bg-white/90 py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-500 backdrop-blur focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    {searchQuery.trim() && (
                      <button
                        type="submit"
                        className="inline-block rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-3 font-bold text-white transition hover:opacity-95"
                      >
                        {t("quizSearchCta")}
                      </button>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}
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
