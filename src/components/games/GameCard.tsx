import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { AllGamesEntry } from "@/lib/games/allGames";

/**
 * Presentational, dual-use card for one ALL_GAMES entry. Deliberately has
 * no "use client" directive and no data fetching: it renders fine inside a
 * Server Component (the /categories sidebar, the homepage carousel) and,
 * when imported by a Client Component (the per-category sidebar, the nav),
 * gets bundled client-side and reads i18n from NextIntlClientProvider.
 *
 * Access gating (unlock modals, guest/login states) is NOT here -- Puzzle
 * du Jour's is a client island (PuzzleDuJourGameCard); everything else is
 * handled by the destination route.
 */

const NEURON_ICON_SRC = "/icono-neurona/neurona-hex-32.png";

export type GameCardVariant = "grid" | "list" | "dropdown";

type GameCardProps = {
  game: AllGamesEntry;
  isPro: boolean;
  variant: GameCardVariant;
  /** Only honoured by the "grid" variant, and only if the entry has one. */
  withDescription?: boolean;
  /** e.g. closing the mobile nav sheet on navigation. */
  onNavigate?: () => void;
  className?: string;
};

function GameImage({ game, className }: { game: AllGamesEntry; className: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-lg", className)}>
      {game.image ? (
        <Image src={game.image} alt="" fill className="object-cover" sizes="32px" />
      ) : game.icon ? (
        <div className="flex h-full w-full items-center justify-center text-violet-600 dark:text-violet-400">
          <game.icon className="h-5 w-5" />
        </div>
      ) : null}
    </div>
  );
}

function GameBadge({
  game,
  isPro,
  variant,
}: {
  game: AllGamesEntry;
  isPro: boolean;
  variant: GameCardVariant;
}) {
  const t = useTranslations();

  if (isPro) return null;

  const positioned =
    variant === "grid"
      ? "absolute -top-1.5 -right-1.5"
      : "";
  const base = cn(
    positioned,
    "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
  );

  if (game.showProBadge) {
    return (
      <span className={cn(base, "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300")}>
        {t("Navbar.proBadge")}
      </span>
    );
  }

  if (game.neuronCost != null) {
    return (
      <span className={cn(base, "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300")}>
        <Image src={NEURON_ICON_SRC} alt="" width={9} height={9} />
        {game.neuronCost}
      </span>
    );
  }

  return null;
}

export default function GameCard({
  game,
  isPro,
  variant,
  withDescription,
  onNavigate,
  className,
}: GameCardProps) {
  const t = useTranslations();
  const title = t(`${game.i18nNamespace}.${game.i18nKey}`);
  const description =
    withDescription && game.descriptionKey
      ? t(`${game.i18nNamespace}.${game.descriptionKey}`)
      : null;

  const badge = <GameBadge game={game} isPro={isPro} variant={variant} />;

  // The nav dropdown owns its own <DropdownMenuItem>/<Link> wrapper, so this
  // variant is just the row's inner content.
  if (variant === "dropdown") {
    return (
      <span className="flex w-full items-center justify-between gap-2">
        <span>{title}</span>
        {badge}
      </span>
    );
  }

  if (variant === "list") {
    return (
      <Link
        href={game.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10",
          className
        )}
      >
        <GameImage game={game} className="h-6 w-6" />
        <span className="flex-1 truncate">{title}</span>
        {badge}
      </Link>
    );
  }

  return (
    <Link
      href={game.href}
      onClick={onNavigate}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10",
        className
      )}
    >
      {badge}
      <GameImage game={game} className="h-8 w-8" />
      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{title}</span>
      {description && (
        <span className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">{description}</span>
      )}
    </Link>
  );
}
