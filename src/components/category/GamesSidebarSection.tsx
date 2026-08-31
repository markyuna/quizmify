import { getTranslations } from "next-intl/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { ALL_GAMES } from "@/lib/games/allGames";
import GameCard from "@/components/games/GameCard";
import PuzzleDuJourGameCard from "@/components/games/PuzzleDuJourGameCard";

/**
 * Server Component, deliberately -- isPro is read straight from Prisma here
 * rather than through a client-side eligibility fetch, so this whole
 * section ships with zero client JS. It renders every ALL_GAMES entry via
 * <GameCard>; access gating (guest/login, Puzzle du Jour's unlock flow)
 * lives on each game's destination route, not on these cards.
 */
export default async function GamesSidebarSection() {
  const t = await getTranslations("CategoriesPage");

  const session = await getAuthSession();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { subscriptionStatus: true, premiumUntil: true },
      })
    : null;
  const isPro = user ? isEffectivelyPro(user) : false;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t("gamesHeading")}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {ALL_GAMES.map((game) =>
          game.key === "puzzle-du-jour" ? (
            <PuzzleDuJourGameCard key={game.key} game={game} initialIsPro={isPro} />
          ) : (
            <GameCard key={game.key} game={game} isPro={isPro} variant="grid" />
          )
        )}
      </div>
    </div>
  );
}
