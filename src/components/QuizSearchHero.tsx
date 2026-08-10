"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuestId } from "@/hooks/useGuestRound";

export default function QuizSearchHero() {
  const t = useTranslations("GuestGames");
  const router = useRouter();
  const { data: session } = useSession();
  const guestId = useGuestId(); // Mint/read the guestId cookie
  const [searchTopic, setSearchTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = !!session?.user;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchTopic.trim()) {
      setError(t("guestSearchEmptyTopic"));
      return;
    }

    if (!guestId) {
      setError(t("guestSearchInitializing"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Si está autenticado, redirige a crear quiz normal, no guest quiz
      if (isAuthenticated) {
        router.push(`/quiz?topic=${encodeURIComponent(searchTopic.trim())}`);
        return;
      }

      // Para guests, usa el endpoint guest-quiz-search
      const response = await fetch("/api/guest-quiz-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: searchTopic.trim() }),
      });

      const data = await response.json();
      console.log("Search response:", { status: response.status, data });

      if (response.ok && data.gameId) {
        // Topic found and game created, redirect to play
        router.push(`/play/mcq/${data.gameId}`);
      } else if (response.status === 404) {
        // Topic not found, redirect to login/register
        setError(t("guestSearchNotFound"));
        // Store the intended topic in sessionStorage for post-login redirect
        if (typeof window !== "undefined") {
          sessionStorage.setItem("intendedTopic", searchTopic.trim());
        }
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        const errorMsg = data.error || data.message || t("guestSearchEmptyTopic");
        console.error("API error:", errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative z-10 overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(124,58,237,0.3)]"
    >
      {/* Background image with overlay */}
      <div className="absolute inset-0 -z-20">
        <Image
          src="/images/games/quiz-search-bg.webp"
          alt="Quiz search background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/50 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center gap-6 px-6 py-16 md:px-8 md:py-24">
        <div className="max-w-xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl mb-3">
            {t("quizSearchTitle")}
          </h2>
          <p className="text-white/80 text-sm md:text-base">
            {t("quizSearchSubtitle")}
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl space-y-3">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder={t("quizSearchPlaceholder")}
                value={searchTopic}
                onChange={(e) => {
                  setSearchTopic(e.target.value);
                  setError(null);
                }}
                disabled={isLoading}
                className="pl-10 h-12 bg-white/95 dark:bg-slate-900/95 border border-white/20 text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !searchTopic.trim() || !guestId}
              className="h-12 px-6 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("guestSearchSearching")}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {t("quizSearchCta")}
                </>
              )}
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-red-500/20 border border-red-500/40 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </motion.div>
          )}
        </form>

        {/* Info message */}
        <p className="text-xs text-white/60 max-w-xl text-center">
          💡 {t("guestSearchInfo", { defaultValue: "First time? Search a topic to try a 5-question preview. Sign up after to save your results and unlock more features." })}
        </p>
      </div>
    </motion.div>
  );
}
