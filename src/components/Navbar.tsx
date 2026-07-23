import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getAuthSession } from "@/lib/nextauth";
import Logo from "./Logo";
import { buttonVariants } from "./ui/button";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import UserAccountNav from "./UserAccountNav";

export default async function Navbar() {
  const session = await getAuthSession();
  const t = await getTranslations("Navbar");

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center" aria-label="Quizmify">
          <Logo />
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          {session?.user ? (
            <UserAccountNav user={session.user} />
          ) : (
            <Link href="/login" className={buttonVariants()}>
              {t("signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
