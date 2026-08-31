"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

type GameState = {
  board: (string | null)[];
  status: "in_progress" | "won" | "lost" | "draw";
  xpEarned: number;
};

export default function MorpionGamePage() {
  // useParams(), not a `params` prop -- in this Next.js version a page's
  // `params` prop is a Promise even for client components, so a client
  // component reads the route param through this hook instead (see
  // AGENTS.md: this Next.js has breaking changes from training data).
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const t = useTranslations("MorpionGame");
  const { toast } = useToast();

  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [gameStatus, setGameStatus] = useState<GameState["status"]>("in_progress");
  const [xpEarned, setXpEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [hitFreeLimit, setHitFreeLimit] = useState(false);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      router.push("/login");
      return;
    }

    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/morpion/${gameId}`);
        if (!res.ok) throw new Error("Failed to fetch game");

        const data = await res.json();
        setBoard(data.board);
        setGameStatus(data.status);
        setXpEarned(data.xpEarned);
      } catch (error) {
        console.error("Error fetching game:", error);
        toast({
          title: "Error",
          description: t("error"),
          variant: "destructive",
        });
        router.push("/morpion");
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [sessionStatus, gameId, router, t, toast]);

  const handleMove = async (position: number) => {
    if (gameStatus !== "in_progress" || board[position] !== null || playing) return;

    setPlaying(true);

    try {
      const res = await fetch(`/api/morpion/${gameId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position }),
      });

      if (!res.ok) throw new Error("Failed to make move");

      const data = await res.json();
      setBoard(data.board);
      setGameStatus(data.status);
      setXpEarned(data.xpEarned);
      setHitFreeLimit(data.hitFreeLimit);
    } catch (error) {
      console.error("Error making move:", error);
      toast({
        title: "Error",
        description: t("error"),
        variant: "destructive",
      });
    } finally {
      setPlaying(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  const statusMessage =
    gameStatus === "won" ? t("won") : gameStatus === "lost" ? t("lost") : gameStatus === "draw" ? t("draw") : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <div className="mx-auto max-w-md">
        <h1 className="mb-8 text-3xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>

        <div className="mb-8 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          {board.map((cell, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleMove(idx)}
              disabled={gameStatus !== "in_progress" || playing || cell !== null}
              className={`flex aspect-square items-center justify-center rounded-xl border border-slate-200 text-3xl font-bold transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 ${
                cell === "X"
                  ? "bg-white text-red-500 dark:bg-white/10"
                  : cell === "O"
                    ? "bg-white text-blue-500 dark:bg-white/10"
                    : "bg-white text-slate-900 hover:bg-slate-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              }`}
            >
              {cell}
            </button>
          ))}
        </div>

        {gameStatus !== "in_progress" && (
          <div className="mb-8 text-center">
            <p
              className={`text-xl font-bold ${
                gameStatus === "won"
                  ? "text-emerald-500"
                  : gameStatus === "lost"
                    ? "text-red-500"
                    : "text-amber-500"
              }`}
            >
              {statusMessage}
            </p>
            {xpEarned > 0 && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">+{xpEarned} XP</p>}
            {hitFreeLimit && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("hitFreeLimit")}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          {gameStatus !== "in_progress" && (
            <Button onClick={() => router.push("/morpion")} className="h-11 w-full rounded-2xl">
              {t("playAgain")}
            </Button>
          )}
          <Link
            href="/"
            className="block text-center text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
