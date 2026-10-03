import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { isEffectivelyPro } from "@/lib/paywall";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { buttonVariants } from "./ui/button";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import UserAccountNav from "./UserAccountNav";
import NotificationBell from "./NotificationBell";
import PrimaryNav from "./nav/PrimaryNav";
import { getUnreadNotificationCount } from "@/lib/inAppNotifications";

export default async function Navbar() {
  const session = await getAuthSession();
  const t = await getTranslations("Navbar");

  // Server-rendered, so read Pro status straight from the DB (same pattern
  // as GameCarousel.tsx / ProStatusBanner.tsx) and hand PrimaryNav a plain
  // boolean -- keeps the "Go Pro" CTA from flashing in for a user who
  // already is Pro. Run alongside the unread-notifications count rather
  // than sequentially -- two independent reads, no reason to wait on one
  // before starting the other.
  const [user, unreadCount] = await Promise.all([
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { subscriptionStatus: true, premiumUntil: true },
        })
      : Promise.resolve(null),
    session?.user?.id ? getUnreadNotificationCount(session.user.id) : Promise.resolve(0),
  ]);
  const isPro = user ? isEffectivelyPro(user) : false;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-2 md:gap-5">
          <Link href="/" className="flex items-center" aria-label="Quizmify">
            <Logo />
          </Link>
          <PrimaryNav isPro={isPro} isLoggedIn={!!session?.user} />
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          {session?.user ? (
            <>
              <NotificationBell initialUnreadCount={unreadCount} />
              <UserAccountNav user={session.user} />
            </>
          ) : (
            <Link href="/login" className={cn(buttonVariants(), "hidden md:inline-flex")}>
              {t("signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
