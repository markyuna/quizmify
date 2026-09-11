"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PEINTRE_XP_PERFECT_BONUS } from "@/lib/peintre/config";

type PlayQuestion = {
  index: number;
  imageUrl: string;
  questionText: string;
  options: string[];
};

type ResultRow = {
  index: number;
  imageUrl: string;
  questionText: string;
  selected: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
};

type GetResponse =
  | { status: "in_progress"; questions: PlayQuestion[] }
  | { status: "completed"; score: number; xpEarned: number; results: ResultRow[] };

type SubmitResponse = {
  score: number;
  xpEarned: number;
  perfect: boolean;
  hitFreeLimit: boolean;
  results: Array<Omit<ResultRow, "imageUrl" | "questionText">>;
};

type Props = {
  gameId: string;
};

export default function PeintreGameBoard({ gameId }: Props) {
  const t = useTranslations("Peintre");
  const router = useRouter();
  const { toast } = useToast();

  const [questions, setQuestions] = React.useState<PlayQuestion[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);

  const [step, setStep] = React.useState(0);
  const [picks, setPicks] = React.useState<Record<number, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const [summary, setSummary] = React.useState<{
    score: number;
    xpEarned: number;
    perfect: boolean;
    hitFreeLimit: boolean;
    rows: ResultRow[];
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/peintre/${gameId}`);
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as GetResponse;
        if (cancelled) return;
        if (data.status === "completed") {
          setSummary({
            score: data.score,
            xpEarned: data.xpEarned,
            perfect: data.score === data.results.length,
            hitFreeLimit: false,
            rows: data.results,
          });
        } else {
          setQuestions(data.questions);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const total = questions?.length ?? 0;
  const current = questions?.[step];
  const answeredCount = Object.keys(picks).length;
  const isLast = step === total - 1;

  async function handleSubmit() {
    if (!questions || submitting) return;
    setSubmitting(true);
    try {
      const answers = questions.map((q) => ({
        index: q.index,
        selected: picks[q.index] ?? "",
      }));
      const res = await fetch(`/api/peintre/${gameId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("submit failed");
      const data = (await res.json()) as SubmitResponse;
      const byIndex = new Map(questions.map((q) => [q.index, q]));
      const rows: ResultRow[] = data.results.map((r) => ({
        ...r,
        imageUrl: byIndex.get(r.index)?.imageUrl ?? "",
        questionText: byIndex.get(r.index)?.questionText ?? "",
      }));
      setSummary({
        score: data.score,
        xpEarned: data.xpEarned,
        perfect: data.perfect,
        hitFreeLimit: data.hitFreeLimit,
        rows,
      });
    } catch {
      toast({ title: t("errorTitle"), description: t("errorGeneric"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">{t("errorGeneric")}</p>
        <Button onClick={() => router.push("/peintre")}>{t("playAgain")}</Button>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 text-center dark:border-violet-500/30 dark:bg-violet-500/10">
          <p className="text-sm font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">
            {t("resultTitle")}
          </p>
          <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
            {t("scoreLine", { score: summary.score })}
          </p>
          <p className="mt-2 text-sm font-semibold text-emerald-600">
            {t("xpLine", { xp: summary.xpEarned })}
          </p>
          {summary.perfect && (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {t("perfectLine", { bonus: PEINTRE_XP_PERFECT_BONUS })}
            </p>
          )}
        </div>

        {summary.hitFreeLimit && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            {t("hitFreeLimit")}
          </p>
        )}

        <ul className="space-y-3">
          {summary.rows.map((r) => (
            <li
              key={r.index}
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- natural aspect ratio */}
              <img
                src={r.imageUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  {r.correct ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-rose-500" />
                  )}
                  <span className="truncate">{r.questionText}</span>
                </p>
                {!r.correct && (
                  <p className="mt-0.5 text-xs text-rose-500">
                    {t("yourAnswer", { answer: r.selected || "—" })}
                  </p>
                )}
                <p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {r.correctAnswer}
                </p>
                <p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">
                  {r.explanation}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <Button onClick={() => router.push("/peintre")}>{t("playAgain")}</Button>
          <Link
            href="/"
            className="block text-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const picked = picks[current.index];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">
        <span>{t("progress", { current: step + 1, total })}</span>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-8">
        <div className="flex justify-center">
          <div className="inline-flex rounded-md border-[10px] border-white bg-white shadow-xl dark:border-white/90">
            {/* eslint-disable-next-line @next/next/no-img-element -- natural aspect ratio, not a fixed box */}
            <img
              src={current.imageUrl}
              alt=""
              className="block max-h-72 max-w-full rounded-sm object-contain sm:max-h-96 lg:max-h-[60vh]"
            />
          </div>
        </div>

        <div className="mt-6 space-y-6 lg:mt-0">
          <h1 className="text-center text-lg font-bold leading-snug text-slate-900 dark:text-white sm:text-xl">
            {current.questionText}
          </h1>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {current.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPicks((p) => ({ ...p, [current.index]: opt }))}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                  picked === opt
                    ? "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500/60 dark:bg-violet-500/15 dark:text-violet-200"
                    : "border-slate-200 text-slate-700 hover:border-violet-300 dark:border-white/10 dark:text-slate-200"
                )}
              >
                {opt}
              </button>
            ))}
          </div>

          {isLast ? (
            <Button
              onClick={handleSubmit}
              disabled={answeredCount < total || submitting}
              className="w-full"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("seeResultButton")}
            </Button>
          ) : (
            <Button
              onClick={() => setStep((s) => Math.min(s + 1, total - 1))}
              disabled={!picked}
              className="w-full"
            >
              {t("nextButton")}
            </Button>
          )}
        </div>
      </div>

      <Link
        href="/"
        className="block text-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
