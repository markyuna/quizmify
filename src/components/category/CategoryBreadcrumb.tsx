import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { CategoryGroup } from "@/lib/categories";

type CategoryBreadcrumbProps = {
  group: CategoryGroup;
  name: string;
};

export default function CategoryBreadcrumb({ group, name }: CategoryBreadcrumbProps) {
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
      <Link href="/quiz" className="font-medium hover:text-violet-600 dark:hover:text-violet-400">
        Quiz
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <span>{group}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold text-slate-900 dark:text-white">{name}</span>
    </nav>
  );
}
