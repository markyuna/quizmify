import Link from "next/link";

export type CategoryCardProps = {
  icon: string;
  name: string;
  href: string;
  // Pre-formatted, already-translated count label (e.g. via
  // CategoriesPage.topicCount) -- omit to hide it entirely, same as the
  // home's curated grid does today.
  count?: string;
};

export default function CategoryCard({ icon, name, href, count }: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="group relative min-w-[150px] shrink-0 snap-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl transition hover:scale-[1.02] hover:shadow-lg dark:border-white/10 dark:bg-white/5 md:min-w-0"
    >
      <div className="flex h-16 w-full items-center justify-center bg-slate-100 text-3xl transition-all duration-300 group-hover:scale-105 group-hover:bg-gradient-to-br group-hover:from-violet-600 group-hover:to-cyan-500 group-hover:shadow-inner dark:bg-white/10">
        <span aria-hidden="true" className="transition-transform duration-300 group-hover:scale-110">
          {icon}
        </span>
      </div>

      <div className="p-2.5">
        <h3 className="line-clamp-2 text-xs font-semibold text-slate-900 dark:text-white">{name}</h3>
        {count && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{count}</p>}
      </div>
    </Link>
  );
}
