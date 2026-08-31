import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Lock } from "lucide-react";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { GAMES_CATALOG } from "@/lib/games/catalog";
import { MORPION_COST_PER_GAME } from "@/lib/neurons/costs";

const QUI_EST_LE_PEINTRE_HREF = `/quiz?topic=${encodeURIComponent("Qui est le peintre?")}&category=arts`;

const cardClass =
  "relative flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-center transition dark:border-white/10 dark:bg-white/5";
const cardInteractiveClass = "hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10";
const cardDisabledClass = "cursor-default opacity-60";
const badgeBaseClass = "absolute -top-1.5 -right-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold";
const proBadgeClass = `${badgeBaseClass} bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300`;
const neuronBadgeClass = `${badgeBaseClass} bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300`;

/**
 * Server Component, deliberately -- same rationale as GameCarousel.tsx's own
 * comment: isPro/neuronsBalance are read straight from Prisma here rather
 * than through a client-side eligibility fetch, so this whole section (all
 * 6 games) ships with zero client JS. Guest/insufficient-balance "gating"
 * is just conditional server-rendered markup (a Link to /login instead of
 * the game, or a plain non-link div) -- no click interception needed.
 *
 * Puzzle du Jour intentionally stays clickable for non-Pro users even
 * though it shows a "Pro" badge: it has a legitimate Neuron-ticket
 * purchase path elsewhere (PuzzleDuJourCarouselItem.tsx) that this section
 * doesn't duplicate. Blocking the click here would cut off that path.
 * Morpion has no such alternative -- it's Pro or a direct per-game Neuron
 * debit, nothing else -- so it's the only card actually disabled for a
 * non-Pro user without enough balance.
 */
export default async function GamesSidebarSection() {
  const [t, tNavbar, tGuestGames, tPuzzle, tMorpion, tPeintre] = await Promise.all([
    getTranslations("CategoriesPage"),
    getTranslations("Navbar"),
    getTranslations("GuestGames"),
    getTranslations("PuzzleDuJour"),
    getTranslations("MorpionPage"),
    getTranslations("CuratedQuizzes.QuiEstLePeintre"),
  ]);

  const session = await getAuthSession();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { subscriptionStatus: true, premiumUntil: true, neuronsBalance: true },
      })
    : null;
  const isPro = user ? isEffectivelyPro(user) : false;
  const neuronsBalance = user?.neuronsBalance ?? 0;
  const isGuest = !session?.user?.id;

  const morpionInsufficient = !isPro && neuronsBalance < MORPION_COST_PER_GAME;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t("gamesHeading")}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {/* The 3 free guest games -- unchanged from before, always
            accessible without login. */}
        {GAMES_CATALOG.map((game) => (
          <Link
            key={game.key}
            href={`/games?game=${game.key}`}
            className={`${cardClass} ${cardInteractiveClass}`}
          >
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
              {game.image ? (
                <Image src={game.image} alt="" fill className="object-cover" sizes="32px" />
              ) : game.icon ? (
                <div className="flex h-full w-full items-center justify-center text-violet-600 dark:text-violet-400">
                  <game.icon className="h-5 w-5" />
                </div>
              ) : null}
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {tGuestGames(game.titleKey)}
            </span>
          </Link>
        ))}

        {/* Qui est le peintre? -- free, no gating, same as the 3 above. */}
        <Link href={QUI_EST_LE_PEINTRE_HREF} className={`${cardClass} ${cardInteractiveClass}`}>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{tPeintre("title")}</span>
        </Link>

        {/* Puzzle du Jour -- guests get a login link, everyone else can
            click through (Pro badge is informational, not a block). */}
        <Link
          href={isGuest ? "/login" : "/puzzle-du-jour"}
          className={`${cardClass} ${cardInteractiveClass}`}
        >
          {!isPro && <span className={proBadgeClass}>{tNavbar("proBadge")}</span>}
          {isGuest && <Lock className="h-4 w-4 text-slate-400" />}
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{tPuzzle("title")}</span>
          {isGuest && <span className="text-[10px] text-slate-400">{tNavbar("signIn")}</span>}
        </Link>

        {/* Morpion -- guests get a login link. Authenticated non-Pro with
            enough Neurons can click through; without enough, it's a plain
            non-interactive div (no client JS needed to "disable" a link). */}
        {isGuest ? (
          <Link href="/login" className={`${cardClass} ${cardInteractiveClass}`}>
            <span className={neuronBadgeClass}>
              <Image src="/icono-neurona/neurona-hex-32.png" alt="" width={9} height={9} />
              {MORPION_COST_PER_GAME}
            </span>
            <Lock className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{tMorpion("title")}</span>
            <span className="text-[10px] text-slate-400">{tNavbar("signIn")}</span>
          </Link>
        ) : morpionInsufficient ? (
          <div className={`${cardClass} ${cardDisabledClass}`}>
            <span className={neuronBadgeClass}>
              <Image src="/icono-neurona/neurona-hex-32.png" alt="" width={9} height={9} />
              {MORPION_COST_PER_GAME}
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{tMorpion("title")}</span>
            <span className="text-[10px] text-slate-400">{tMorpion("insufficientNeurons")}</span>
          </div>
        ) : (
          <Link href="/morpion" className={`${cardClass} ${cardInteractiveClass}`}>
            {!isPro && (
              <span className={neuronBadgeClass}>
                <Image src="/icono-neurona/neurona-hex-32.png" alt="" width={9} height={9} />
                {MORPION_COST_PER_GAME}
              </span>
            )}
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{tMorpion("title")}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
