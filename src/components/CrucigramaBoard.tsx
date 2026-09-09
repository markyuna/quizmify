"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { ClientCrossword } from "@/lib/crucigrama/grid";

type WordResult = { number: number; direction: "across" | "down"; correct: boolean };

type Props = {
  gameId: string;
  topic: string;
  difficulty: string;
  initialStatus: "in_progress" | "completed";
  xpEarned: number;
  puzzle: ClientCrossword;
};

const keyOf = (r: number, c: number) => `${r},${c}`;

export default function CrucigramaBoard({ gameId, topic, initialStatus, xpEarned, puzzle }: Props) {
  const t = useTranslations("CrucigramaPage");
  const router = useRouter();
  const { toast } = useToast();

  const cellSet = React.useMemo(
    () => new Set(puzzle.cells.map((c) => keyOf(c.row, c.col))),
    [puzzle.cells]
  );
  const numberAt = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const c of puzzle.cells) if (c.number) m.set(keyOf(c.row, c.col), c.number);
    return m;
  }, [puzzle.cells]);

  const [values, setValues] = React.useState<Record<string, string>>({});
  const [active, setActive] = React.useState<{ row: number; col: number } | null>(null);
  const [direction, setDirection] = React.useState<"across" | "down">("across");
  const [status, setStatus] = React.useState(initialStatus);
  const [earnedXp, setEarnedXp] = React.useState(xpEarned);
  const [wordResults, setWordResults] = React.useState<WordResult[]>([]);
  const [checking, setChecking] = React.useState(false);
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const across = puzzle.entries.filter((e) => e.direction === "across");
  const down = puzzle.entries.filter((e) => e.direction === "down");
  const resultFor = (n: number, d: "across" | "down") =>
    wordResults.find((w) => w.number === n && w.direction === d)?.correct;

  const focusCell = React.useCallback((r: number, c: number) => {
    inputRefs.current[keyOf(r, c)]?.focus();
    setActive({ row: r, col: c });
  }, []);

  const step = (r: number, c: number, dir: "across" | "down", back = false): [number, number] => {
    const d = back ? -1 : 1;
    return dir === "across" ? [r, c + d] : [r + d, c];
  };

  function handleChange(r: number, c: number, raw: string) {
    const ch = raw.slice(-1).toUpperCase();
    // Accept A-Z and Ñ only; the grid never shows accents.
    if (ch && ch !== "Ñ" && !(ch.length === 1 && ch >= "A" && ch <= "Z")) return;
    setValues((v) => ({ ...v, [keyOf(r, c)]: ch }));
    if (ch) {
      const [nr, nc] = step(r, c, direction);
      if (cellSet.has(keyOf(nr, nc))) focusCell(nr, nc);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, r: number, c: number) {
    if (e.key === "Backspace" && !values[keyOf(r, c)]) {
      const [pr, pc] = step(r, c, direction, true);
      if (cellSet.has(keyOf(pr, pc))) {
        setValues((v) => ({ ...v, [keyOf(pr, pc)]: "" }));
        focusCell(pr, pc);
      }
    } else if (e.key === "ArrowRight" && cellSet.has(keyOf(r, c + 1))) {
      setDirection("across");
      focusCell(r, c + 1);
    } else if (e.key === "ArrowLeft" && cellSet.has(keyOf(r, c - 1))) {
      setDirection("across");
      focusCell(r, c - 1);
    } else if (e.key === "ArrowDown" && cellSet.has(keyOf(r + 1, c))) {
      setDirection("down");
      focusCell(r + 1, c);
    } else if (e.key === "ArrowUp" && cellSet.has(keyOf(r - 1, c))) {
      setDirection("down");
      focusCell(r - 1, c);
    } else if (e.key === " ") {
      e.preventDefault();
      setDirection((d) => (d === "across" ? "down" : "across"));
    }
  }

  async function handleCheck() {
    setChecking(true);
    try {
      const res = await fetch(`/api/crucigrama/${gameId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cells: values }),
      });
      if (!res.ok) throw new Error("submit failed");
      const data = (await res.json()) as {
        completed: boolean;
        xpEarned?: number;
        wordResults: WordResult[];
      };
      setWordResults(data.wordResults);
      if (data.completed) {
        setStatus("completed");
        setEarnedXp(data.xpEarned ?? earnedXp);
        toast({ title: t("completedTitle"), description: t("completedXp", { xp: data.xpEarned ?? 0 }) });
      } else {
        toast({ title: t("checkTitle"), description: t("checkKeepGoing") });
      }
    } catch {
      toast({ title: t("errorTitle"), description: t("errorGeneric"), variant: "destructive" });
    } finally {
      setChecking(false);
    }
  }

  const done = status === "completed";
  const cellPx = puzzle.width > 12 ? 30 : puzzle.width > 9 ? 36 : 42;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{topic}</h1>
        {done && (
          <span className="text-sm font-semibold text-emerald-600">
            {t("completedXp", { xp: earnedXp })}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <div
          className="mx-auto"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${puzzle.width}, ${cellPx}px)`,
            gridTemplateRows: `repeat(${puzzle.height}, ${cellPx}px)`,
            width: puzzle.width * cellPx,
          }}
        >
          {Array.from({ length: puzzle.height }).flatMap((_, r) =>
            Array.from({ length: puzzle.width }).map((__, c) => {
              const k = keyOf(r, c);
              if (!cellSet.has(k)) return <div key={k} />;
              const num = numberAt.get(k);
              const isActive = active?.row === r && active?.col === c;
              return (
                <div key={k} className="relative">
                  {num != null && (
                    <span className="pointer-events-none absolute left-0.5 top-0 z-10 text-[9px] leading-none text-slate-500">
                      {num}
                    </span>
                  )}
                  <input
                    ref={(el) => {
                      inputRefs.current[k] = el;
                    }}
                    value={values[k] ?? ""}
                    disabled={done}
                    maxLength={1}
                    autoComplete="off"
                    inputMode="text"
                    aria-label={t("cellAriaLabel", { row: r + 1, col: c + 1 })}
                    onChange={(e) => handleChange(r, c, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, r, c)}
                    onFocus={() => setActive({ row: r, col: c })}
                    onClick={() => {
                      if (isActive) setDirection((d) => (d === "across" ? "down" : "across"));
                    }}
                    className={cn(
                      "h-full w-full border border-slate-300 text-center text-sm font-bold uppercase text-slate-900 caret-transparent focus:outline-none dark:border-slate-600 dark:text-white",
                      isActive ? "bg-violet-200 dark:bg-violet-500/40" : "bg-white dark:bg-slate-800"
                    )}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {!done && (
        <Button onClick={handleCheck} disabled={checking} className="w-full">
          {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("checkButton")}
        </Button>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {([
          ["across", across],
          ["down", down],
        ] as const).map(([dir, list]) => (
          <div key={dir}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              {dir === "across" ? t("across") : t("down")}
            </h2>
            <ul className="space-y-1.5">
              {list.map((e) => {
                const ok = resultFor(e.number, e.direction);
                return (
                  <li
                    key={`${e.number}-${e.direction}`}
                    onClick={() => {
                      setDirection(e.direction);
                      focusCell(e.row, e.col);
                    }}
                    className={cn(
                      "cursor-pointer rounded-lg px-2 py-1 text-sm",
                      ok === true && "text-emerald-600",
                      ok === false && "text-rose-500",
                      ok === undefined && "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <span className="font-bold">{e.number}.</span> {e.clue}{" "}
                    <span className="text-xs text-slate-400">({e.length})</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {done && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-lg font-bold text-emerald-600">{t("completedTitle")}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t("completedXp", { xp: earnedXp })}
          </p>
          <Button onClick={() => router.push("/crucigrama")} className="mt-4">
            {t("playAgain")}
          </Button>
        </div>
      )}

      <Link
        href="/"
        className="block text-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
