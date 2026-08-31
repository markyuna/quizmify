import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("Footer");

  const LEGAL_LINKS = [
    { href: "/about", label: t("about") },
    { href: "/mentions-legales", label: t("mentionsLegales") },
    { href: "/confidentialite", label: t("confidentialite") },
    { href: "/cgu-cgv", label: t("cguCgv") },
    { href: "/contact", label: t("contact") },
  ];

  return (
    <footer className="border-t border-slate-200/80 py-6 dark:border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8 dark:text-slate-400">
        <p>&copy; {new Date().getFullYear()} {t("rights")}</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-slate-900 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
