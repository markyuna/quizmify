import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";

import { getLatestTopics, getTopicCategorySlugs } from "@/lib/topics";
import { getTopicImage } from "@/lib/topicImages";
import { getCategoryBySlug } from "@/lib/categories";
import { getRequestLocale } from "@/i18n/get-locale";

/**
 * A plain Server Component: fetches the latest-topics list directly
 * (rather than round-tripping through GET /api/topics/popular, which serves
 * a different, usage-ranked list for other callers) so the cards are
 * present in the initial HTML. This route is already dynamically rendered
 * per-request -- HomePage calls getAuthSession(), which reads cookies() and
 * opts the whole tree out of static rendering -- so a freshly created topic
 * shows up on the very next load with no extra cache-invalidation plumbing
 * needed. Renders nothing when the Supabase cache has no active topics yet
 * for this language -- there's no empty-state copy to show for a "recent
 * topics" shelf with zero topics.
 */
export default async function TopicCarousel() {
  const t = await getTranslations("TopicCarousel");
  const locale = await getRequestLocale();

  const topics = await getLatestTopics(locale);

  if (topics.length === 0) return null;

  const categorySlugByTopic = await getTopicCategorySlugs(topics, locale);

  return (
    <section className="px-4 pt-4 md:px-8" aria-labelledby="topic-carousel-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center gap-2">
          <Compass className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <h2 id="topic-carousel-heading" className="text-lg font-bold text-slate-900 dark:text-white md:text-xl">
            {t("title")}
          </h2>
        </div>
        <p className="mb-5 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{t("subtitle")}</p>

        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
          {topics.map((topic) => {
            const { image } = getTopicImage(topic);
            const categorySlug = categorySlugByTopic.get(topic);
            const category = categorySlug ? getCategoryBySlug(categorySlug) : undefined;
            const backgroundImage = category?.heroImage ?? image;

            return (
              <Link
                key={topic}
                href={`/quiz?topic=${encodeURIComponent(topic)}`}
                className="relative min-w-[260px] shrink-0 snap-center overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl transition hover:scale-[1.02] hover:shadow-lg dark:border-white/10 dark:bg-white/5 md:min-w-0"
              >
                <div className="absolute inset-0 -z-10">
                  <Image src={backgroundImage} alt="" fill className="object-cover opacity-20 dark:opacity-25" sizes="320px" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/50 to-white dark:from-transparent dark:via-slate-950/40 dark:to-slate-950" />
                </div>

                <div className="p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 text-white shadow-lg">
                    <Compass className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{topic}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t("cardDescription")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
