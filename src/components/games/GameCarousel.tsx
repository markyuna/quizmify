import { getTranslations } from "next-intl/server";
import { Flame } from "lucide-react";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { ALL_GAMES } from "@/lib/games/allGames";
import GameCard from "@/components/games/GameCard";
import PuzzleDuJourGameCard from "@/components/games/PuzzleDuJourGameCard";

/**
 * A plain Server Component listing every game (ALL_GAMES) as a grid of
 * <GameCard>s. isPro is read from the DB directly (same as
 * ProStatusBanner.tsx) so the Pro/Neuron badges are correct without a
 * client-side eligibility fetch. Access gating lives on each game's route.
 */
export default async function GameCarousel() {
  const t = await getTranslations("GuestGames");

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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ALL_GAMES.map((game) =>
            game.key === "puzzle-du-jour" ? (
              <PuzzleDuJourGameCard key={game.key} game={game} initialIsPro={isPro} />
            ) : (
              <GameCard key={game.key} game={game} isPro={isPro} variant="grid" />
            )
          )}
        </div>
      </div>
    </section>
  );
}
