import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Flame, Lock } from "lucide-react";

import { GAMES_CATALOG } from "@/lib/games/catalog";
import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";

/**
 * A plain Server Component listing the daily mini-games and tests as links into
 * /games (the combined list + dynamic-content page) instead of embedding
 * the interactive cards inline -- keeps the homepage free of the guest-game
 * client bundle (react-query, per-game input UI, ConversionModal) until
 * someone actually opens one. The `game` query param lets /games preselect
 * the one that was clicked instead of always defaulting to Word of the Day.
 */

export default async function GameCarousel() {
  const t = await getTranslations("GuestGames");
  const tPuzzleDuJour = await getTranslations("PuzzleDuJour");

  // Server-rendered, so this can just read the DB directly (same as
  // ProStatusBanner.tsx) instead of a client-side eligibility fetch --
  // hides the Pro badge once the visitor already is Pro, matching how the
  // rest of the app treats that badge everywhere else.
  const session = await getAuthSession();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { subscriptionStatus: true, premiumUntil: true },
      })
    : null;
  const isPro = user ? isEffectivelyPro(user) : false;

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
          {GAMES_CATALOG.map((game) => (
            <li key={game.key}>
              <Link
                href={`/games?game=${game.key}`}
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

          {/* Not a GAMES_CATALOG entry on purpose -- see the identical
              comment in CategorySidebar.tsx. */}
          <li>
            <Link
              href="/puzzle-du-jour"
              className="flex items-center gap-3 p-4 font-semibold text-slate-900 transition hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                <Image
                  src="/images/games/puzzle-du-jour-icon.png"
                  alt={tPuzzleDuJour("title")}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              <span className="flex-1 truncate">→ {tPuzzleDuJour("title")}</span>
              {!isPro && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                  <Lock className="h-2.5 w-2.5" />
                  {tPuzzleDuJour("proBadge")}
                </span>
              )}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
