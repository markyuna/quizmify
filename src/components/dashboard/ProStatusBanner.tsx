import Link from "next/link";
import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getFrozenLevel, isEffectivelyPro, isLevelFrozen } from "@/lib/pro";

type ProStatusBannerProps = {
  user: {
    xp: number;
    subscriptionStatus: string;
    premiumUntil: Date | null;
  };
};

/**
 * Surfaces level progress sitting frozen behind the free cap. The "Pro
 * actif" active-grant banner was deliberately removed -- a Pro user gets
 * no banner here at all now.
 *
 * Note the frozen case covers more than lapsed subscribers: because xp now
 * accumulates past the cap for everyone (see src/lib/pro.ts), any free user
 * who keeps playing eventually banks enough for a level they can't use yet,
 * and gets told so. That's deliberate -- "level 7 is already yours, unlock
 * it" is a stronger and more honest prompt than a generic upgrade nag.
 * Renders nothing for a free user still under the cap, and nothing for a
 * Pro user either.
 */
export default async function ProStatusBanner({ user }: ProStatusBannerProps) {
  const t = await getTranslations("ProStatus");
  const isPro = isEffectivelyPro(user);

  if (isPro) return null;

  if (!isLevelFrozen(user)) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-violet-300/60 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-violet-400/30">
      <div className="flex items-start gap-2.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("frozenTitle", { level: getFrozenLevel(user) })}
          </p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            {t("frozenBody")}
          </p>
        </div>
      </div>

      <Link
        href="/upgrade"
        className="shrink-0 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        {t("resumeCta")}
      </Link>
    </div>
  );
}
