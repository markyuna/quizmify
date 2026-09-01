"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Verdict = "yes" | "no" | "partial";
type Turn = { question: string; verdict: Verdict; explanation: string };

type GameState = {
  status: "in_progress" | "won" | "lost";
  questionsAsked: number;
  questionLimit: number;
  turns: Turn[];
  score: number | null;
  xpEarned: number;
  characterName: string | null;
};

const VERDICT_STYLE: Record<Verdict, string> = {
  yes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  no: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

export default function AkinatorGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const t = useTranslations("AkinatorGame");
  const { toast } = useToast();

  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [guess, setGuess] = useState("");
  const [guessing, setGuessing] = useState(false);
  const [showGuess, setShowGuess] = useState(false);

  const load = useCallback(() => {
    return fetch(`/api/akinator/${gameId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data: GameState) => setGame(data))
      .catch(() => setGame(null));
  }, [gameId]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (sessionStatus !== "authenticated") return;
    load().finally(() => setLoading(false));
  }, [sessionStatus, router, load]);

  const verdictLabel = (v: Verdict) =>
    v === "yes" ? t("verdictYes") : v === "no" ? t("verdictNo") : t("verdictPartial");

  const outOfQuestions = !!game && game.questionsAsked >= game.questionLimit;

  async function askQuestion() {
    const trimmed = question.trim();
    if (!trimmed || asking) return;
    setAsking(true);
    try {
      const res = await fetch(`/api/akinator/${gameId}/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!res.ok) throw new Error("ask failed");
      const data = (await res.json()) as { turn: Turn; questionsAsked: number };
      setGame((g) =>
        g ? { ...g, turns: [...g.turns, data.turn], questionsAsked: data.questionsAsked } : g
      );
      setQuestion("");
    } catch (error) {
      console.error("Akinator question failed:", error);
      toast({ title: t("error"), description: t("failedToAsk"), variant: "destructive" });
    } finally {
      setAsking(false);
    }
  }

  async function submitGuess() {
    const trimmed = guess.trim();
    if (!trimmed || guessing) return;
    setGuessing(true);
    try {
      const res = await fetch(`/api/akinator/${gameId}/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: trimmed }),
      });
      if (!res.ok) throw new Error("guess failed");
      const data = (await res.json()) as {
        won: boolean;
        score?: number;
        xpEarned?: number;
        characterName: string;
      };
      setShowGuess(false);
      setGuess("");
      await load();
      if (data.won) {
        toast({ title: t("wonTitle"), description: t("wonToast", { xp: data.xpEarned ?? 0 }) });
      }
    } catch (error) {
      console.error("Akinator guess failed:", error);
      toast({ title: t("error"), description: t("failedToGuess"), variant: "destructive" });
    } finally {
      setGuessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-slate-600 dark:text-slate-300">{t("gameNotFound")}</p>
        <Button onClick={() => router.push("/akinator")}>{t("backToStart")}</Button>
      </div>
    );
  }

  const over = game.status !== "in_progress";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t("questionCounter", { current: game.questionsAsked, total: game.questionLimit })}
          </span>
        </div>

        {/* Transcript */}
        {game.turns.length > 0 && (
          <ul className="mb-6 space-y-3">
            {game.turns.map((turn, i) => (
              <li
                key={i}
                className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {turn.question}
                </p>
                <div className="mt-1.5 flex items-start gap-2">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      VERDICT_STYLE[turn.verdict]
                    )}
                  >
                    {verdictLabel(turn.verdict)}
                  </span>
                  {turn.explanation && (
                    <span className="text-xs text-slate-600 dark:text-slate-300">{turn.explanation}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Play area */}
        {!over && (
          <div className="space-y-3">
            {outOfQuestions ? (
              <p className="rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                {t("outOfQuestions")}
              </p>
            ) : (
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("questionPlaceholder")}
                maxLength={200}
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            )}

            <div className="flex gap-2">
              {!outOfQuestions && (
                <Button onClick={askQuestion} disabled={!question.trim() || asking} className="flex-1">
                  {asking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t("askButton")}
                </Button>
              )}
              <Button
                onClick={() => setShowGuess(true)}
                variant={outOfQuestions ? "default" : "outline"}
                className={outOfQuestions ? "flex-1" : "px-6"}
              >
                {t("guessButton")}
              </Button>
            </div>
          </div>
        )}

        {/* Result */}
        {over && (
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-6 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            {game.status === "won" ? (
              <>
                <p className="text-xl font-bold text-emerald-500">{t("wonTitle")}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t("wonSummary", {
                    questions: game.questionsAsked,
                    score: game.score ?? 0,
                    xp: game.xpEarned,
                  })}
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-amber-500">{t("lostTitle")}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t("lostSummary", { character: game.characterName ?? "?" })}
                </p>
              </>
            )}
            <Button onClick={() => router.push("/akinator")} className="w-full">
              {t("playAgain")}
            </Button>
          </div>
        )}

        <Link
          href="/"
          className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          {t("backHome")}
        </Link>
      </div>

      <Dialog open={showGuess} onOpenChange={setShowGuess}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("guessModalTitle")}</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder={t("guessPlaceholder")}
            maxLength={100}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowGuess(false)} className="flex-1">
              {t("guessCancel")}
            </Button>
            <Button onClick={submitGuess} disabled={!guess.trim() || guessing} className="flex-1">
              {guessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("guessSubmit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
