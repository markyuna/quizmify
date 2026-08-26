import { getTranslations } from "next-intl/server";

import CategoryCard from "@/components/category/CategoryCard";
import type { CategoryGroupEntry } from "@/lib/categories";

type CategoryGroupSectionProps = {
  entry: CategoryGroupEntry;
  countsBySlug: Record<string, number>;
};

export default async function CategoryGroupSection({ entry, countsBySlug }: CategoryGroupSectionProps) {
  const tGroups = await getTranslations("CategoryGroups");
  const tCategories = await getTranslations("Categories");
  const t = await getTranslations("CategoriesPage");

  return (
    <section aria-labelledby={`category-group-${entry.group}`}>
      <h2
        id={`category-group-${entry.group}`}
        className="mb-4 text-lg font-bold text-slate-900 dark:text-white md:text-xl"
      >
        {tGroups(entry.group)}
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {entry.categories.map((category) => (
          <CategoryCard
            key={category.slug}
            icon={category.icon}
            name={tCategories(`${category.slug}.name`)}
            href={`/quiz/categoria/${category.slug}`}
            count={t("topicCount", { count: countsBySlug[category.slug] ?? 0 })}
          />
        ))}
      </div>
    </section>
  );
}
