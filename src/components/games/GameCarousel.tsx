import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Flame } from "lucide-react";

/**
 * A plain Server Component listing the 3 daily mini-games as links into
 * /games (the combined list + dynamic-content page) instead of embedding
 * the interactive cards inline -- keeps the homepage free of the guest-game
 * client bundle (react-query, per-game input UI, ConversionModal) until
 * someone actually opens one. The `game` query param lets /games preselect
 * the one that was clicked instead of always defaulting to Word of the Day.
 */
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
          <li>
            <Link
              href="/games?game=word-of-day"
              className="block p-4 font-semibold text-slate-900 transition hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
            >
              → {t("games.wordOfDay.title")}
            </Link>
          </li>
          <li>
            <Link
              href="/games?game=photo-of-day"
              className="block p-4 font-semibold text-slate-900 transition hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
            >
              → {t("games.photoOfDay.title")}
            </Link>
          </li>
          <li>
            <Link
              href="/games?game=math-target"
              className="block p-4 font-semibold text-slate-900 transition hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
            >
              → {t("games.mathTarget.title")}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
