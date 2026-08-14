import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { CATEGORIES, getCategoryBySlug } from "@/lib/categories";
import { getMockItemsForCategory } from "@/lib/mockCategoryQuizzes";
import CategoryBreadcrumb from "@/components/category/CategoryBreadcrumb";
import CategoryQuizList from "@/components/category/CategoryQuizList";
import CategorySidebar from "@/components/category/CategorySidebar";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return { title: "Catégorie introuvable | Quizmify" };
  }

  return {
    title: `${category.name} | Quizmify`,
    description: category.seoDescription,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const items = getMockItemsForCategory(category.slug);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8 md:px-8">
      <CategoryBreadcrumb group={category.group} name={category.name} />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {category.name}
          </h1>

          <div className="relative mt-4 h-48 w-full overflow-hidden rounded-3xl bg-slate-100 dark:bg-white/10 sm:h-64">
            <Image
              src={category.heroImage}
              alt={category.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 800px"
            />
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            {category.seoDescription}
          </p>

          <div className="mt-6">
            <CategoryQuizList categoryName={category.name} items={items} />
          </div>
        </div>

        <CategorySidebar />
      </div>
    </main>
  );
}
