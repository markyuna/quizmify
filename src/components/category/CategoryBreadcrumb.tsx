import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";

type CategoryBreadcrumbProps = {
  // Already-translated display text -- the caller resolves both via
  // getTranslations("CategoryGroups") / ("Categories") before passing them
  // down, this component just renders.
  group: string;
  name: string;
};

// A plain async Server Component (rendered directly from
// /quiz/categoria/[slug]/page.tsx, itself a Server Component) -- no
// interactivity here, so getTranslations over useTranslations avoids
// shipping this to the client bundle.
export default async function CategoryBreadcrumb({ group, name }: CategoryBreadcrumbProps) {
  const t = await getTranslations("CategoryBreadcrumb");

  return (
    <nav aria-label={t("ariaLabel")} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
      <Link href="/quiz" className="font-medium hover:text-violet-600 dark:hover:text-violet-400">
        {t("quizLink")}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <span>{group}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold text-slate-900 dark:text-white">{name}</span>
    </nav>
  );
}
