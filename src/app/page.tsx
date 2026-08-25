import { getAuthSession } from "@/lib/nextauth";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import TopicCarousel from "@/components/games/TopicCarousel";
import GameCarousel from "@/components/games/GameCarousel";
import FeatureCards from "@/components/FeatureCards";
import WhyQuizmifySection from "@/components/WhyQuizmifySection";
import FinalCtaSection from "@/components/FinalCtaSection";
import { getPopularTopics } from "@/lib/topics";
import { getRequestLocale } from "@/i18n/get-locale";

export const metadata = {
  title: "Quizmify | AI Quiz Generator",
};

export default async function HomePage() {
  const session = await getAuthSession();
  const isAuthenticated = !!session?.user;
  const locale = await getRequestLocale();

  // getPopularTopics() throws on a Supabase read error -- caught here so a
  // decorative Hero placeholder can never take the whole homepage down with
  // it (same defensive stance as GET /api/topics/popular).
  let popularTopics: string[] = [];
  try {
    popularTopics = (await getPopularTopics(locale)).slice(0, 3);
  } catch (error) {
    console.error("Failed to fetch popular topics for Hero placeholder:", error);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <HeroSection isAuthenticated={isAuthenticated} popularTopics={popularTopics} />
      <CategoriesSection />
      <TopicCarousel />
      <GameCarousel />
      <FeatureCards />
      <WhyQuizmifySection />
      <FinalCtaSection isAuthenticated={isAuthenticated} />
    </main>
  );
}
