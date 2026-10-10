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
import MobileMenu from "./nav/MobileMenu";
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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 lg:gap-5">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Quizmify">
            <Logo />
          </Link>
          <PrimaryNav isPro={isPro} />
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          {session?.user && <NotificationBell initialUnreadCount={unreadCount} />}
          {/* Desktop only -- below lg, the account section and sign-in live
              inside MobileMenu instead. */}
          <div className="hidden lg:inline-flex">
            {session?.user ? (
              <UserAccountNav user={session.user} />
            ) : (
              <Link href="/login" className={cn(buttonVariants())}>
                {t("signIn")}
              </Link>
            )}
          </div>
          <MobileMenu isPro={isPro} isLoggedIn={!!session?.user} user={session?.user ?? null} />
        </div>
      </div>
    </header>
  );
}
