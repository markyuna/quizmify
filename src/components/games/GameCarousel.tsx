import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Flame } from "lucide-react";

import { GAMES_CATALOG } from "@/lib/games/catalog";
import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { MORPION_COST_PER_GAME } from "@/lib/neurons/costs";
import PuzzleDuJourCarouselItem from "./PuzzleDuJourCarouselItem";

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
  const tMorpion = await getTranslations("MorpionPage");

  // Server-rendered, so this can just read the DB directly (same as
  // ProStatusBanner.tsx) instead of a client-side eligibility fetch --
  // hides the Pro badge once the visitor already is Pro, matching how the
  // rest of the app treats that badge everywhere else.
  const session = await getAuthSession();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { subscriptionStatus: true, premiumUntil: true, neuronsBalance: true },
      })
    : null;
  const isPro = user ? isEffectivelyPro(user) : false;
  const neuronsBalance = user?.neuronsBalance ?? 0;
  const availableTicket = session?.user?.id
    ? await prisma.neuronUnlock.findFirst({
        where: { userId: session.user.id, gameKey: "puzzleDuJour", status: "available" },
        select: { id: true },
      })
    : null;
  const hasAvailableTicket = !!availableTicket;

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
              comment in CategorySidebar.tsx. Interactivity (the unlock
              modal) lives in this one client sub-component so the rest of
              this Server Component stays free of client-bundle weight. */}
          <PuzzleDuJourCarouselItem
            isPro={isPro}
            hasAvailableTicket={hasAvailableTicket}
            neuronsBalance={neuronsBalance}
          />

          {/* Morpion: no unlock modal needed, unlike Puzzle du Jour above --
              it's a direct per-game Neuron debit taken when a game is
              created on /morpion itself, not a purchasable ticket, so a
              plain server-rendered link is enough here. */}
          <li>
            <Link
              href="/morpion"
              className="flex items-center gap-3 p-4 font-semibold text-slate-900 transition hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                <Image
                  src="/images/games/morpion-icon.png"
                  alt={tMorpion("title")}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              <span className="flex-1 truncate">→ {tMorpion("title")}</span>
              {!isPro && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                  <Image src="/icono-neurona/neurona-hex-32.png" alt="" width={10} height={10} />
                  {tMorpion("costPerGame", { cost: MORPION_COST_PER_GAME })}
                </span>
              )}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
