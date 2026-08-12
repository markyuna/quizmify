import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Flame, Brain } from "lucide-react";

/**
 * A plain Server Component listing the daily mini-games and tests as links into
 * /games (the combined list + dynamic-content page) instead of embedding
 * the interactive cards inline -- keeps the homepage free of the guest-game
 * client bundle (react-query, per-game input UI, ConversionModal) until
 * someone actually opens one. The `game` query param lets /games preselect
 * the one that was clicked instead of always defaulting to Word of the Day.
 */

const GAMES = [
  { gameParam: "word-of-day", titleKey: "games.wordOfDay.title", image: "/images/games/mot-du-jour-bg.webp" },
  { gameParam: "photo-of-day", titleKey: "games.photoOfDay.title", image: "/images/games/photo-du-jour-bg.webp" },
  { gameParam: "math-target", titleKey: "games.mathTarget.title", image: "/images/games/compte-est-bon-bg.webp" },
  { gameParam: "personality-test", titleKey: "games.personalityTest.title", icon: Brain },
];

export default async function GameCarousel() {
  const t = await getTranslations("GuestGames");

  return (
    <section className="px-4 py-10 md:px-8 md:py-14" aria-labelledby="guest-games-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-2">
          <Flame className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h2 id="guest-games-heading" className="text-xl font-bold text-slate-900 dark:text-white md:text-2xl">
            {t("carouselTitle")}
          </h2>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
          {t("carouselSubtitle")}
        </p>

        <ul className="divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-xl dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
          {GAMES.map((game) => (
            <li key={game.gameParam}>
              <Link
                href={`/games?game=${game.gameParam}`}
                className="flex items-center gap-3 p-4 font-semibold text-slate-900 transition hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
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
                      <game.icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                  ) : null}
                </div>
                <span className="truncate">→ {t(game.titleKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
