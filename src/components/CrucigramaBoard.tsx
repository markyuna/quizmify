"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { entryCellKeys, type ClientCrossword } from "@/lib/crucigrama/grid";

type WordResult = { number: number; direction: "across" | "down"; correct: boolean };

type Props = {
  gameId: string;
  topic: string;
  difficulty: string;
  initialStatus: "in_progress" | "completed" | "revealed";
  xpEarned: number;
  puzzle: ClientCrossword;
};

const keyOf = (r: number, c: number) => `${r},${c}`;
const entryIdOf = (n: number, d: "across" | "down") => `${n}-${d}`;
const setWithout = (s: Set<string>, id: string) => {
  const next = new Set(s);
  next.delete(id);
  return next;
};

// Per-word feedback timings.
const WRONG_CLEAR_MS = 650; // red shake/flash, then wipe the word
const SOLVED_PULSE_MS = 450; // green scale-pop, then settle

// Shared cell palettes -- reused by the live per-word feedback and by the
// green (found) / red (missed) marking of a revealed grid.
const CELL_CORRECT =
  "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-500/15 dark:text-emerald-100";
const CELL_WRONG =
  "border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-500/60 dark:bg-rose-500/15 dark:text-rose-100";
const CELL_NEUTRAL =
  "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200";

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
  const [status, setStatus] = React.useState<"in_progress" | "completed" | "revealed">(
    initialStatus
  );
  const [earnedXp, setEarnedXp] = React.useState(xpEarned);
  const [wordResults, setWordResults] = React.useState<WordResult[]>([]);
  const [checking, setChecking] = React.useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = React.useState(false);
  const [revealing, setRevealing] = React.useState(false);
  // Real-time per-word validation. `solvedEntries` is permanent (its cells
  // lock read-only); `wrongEntries` / `pulseEntries` are transient anim flags.
  const [solvedEntries, setSolvedEntries] = React.useState<Set<string>>(new Set());
  const [wrongEntries, setWrongEntries] = React.useState<Set<string>>(new Set());
  const [pulseEntries, setPulseEntries] = React.useState<Set<string>>(new Set());
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const reduceMotion = useReducedMotion() ?? false;

  const navTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const timersRef = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const later = React.useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }, []);

  React.useEffect(
    () => () => {
      if (navTimeout.current) clearTimeout(navTimeout.current);
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current.clear();
    },
    []
  );

  // "number-direction" -> its cell keys; used both to expand solved/wrong
  // sets to cells and to detect which word(s) a filled cell just completed.
  const cellsByEntry = React.useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of puzzle.entries) m.set(entryIdOf(e.number, e.direction), entryCellKeys(e));
    return m;
  }, [puzzle.entries]);

  const expandToCells = React.useCallback(
    (ids: Set<string>) => {
      const s = new Set<string>();
      for (const id of ids) for (const k of cellsByEntry.get(id) ?? []) s.add(k);
      return s;
    },
    [cellsByEntry]
  );
  const solvedCells = React.useMemo(
    () => expandToCells(solvedEntries),
    [expandToCells, solvedEntries]
  );
  const wrongCells = React.useMemo(() => expandToCells(wrongEntries), [expandToCells, wrongEntries]);
  const pulseCells = React.useMemo(() => expandToCells(pulseEntries), [expandToCells, pulseEntries]);

  const solvedEntriesRef = React.useRef(solvedEntries);
  React.useEffect(() => {
    solvedEntriesRef.current = solvedEntries;
  }, [solvedEntries]);

  // Read by in-flight per-word checks so a response that lands *after* the
  // grid was revealed can't mutate solved/wrong sets or wipe a cell.
  const statusRef = React.useRef(status);
  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const across = puzzle.entries.filter((e) => e.direction === "across");
  const down = puzzle.entries.filter((e) => e.direction === "down");
  const resultFor = (n: number, d: "across" | "down") =>
    wordResults.find((w) => w.number === n && w.direction === d)?.correct;

  const focusCell = React.useCallback((r: number, c: number) => {
    inputRefs.current[keyOf(r, c)]?.focus();
    setActive({ row: r, col: c });
  }, []);

  const inFlightRef = React.useRef<Set<string>>(new Set());
  const prevCompleteRef = React.useRef<Set<string>>(new Set());

  const checkWord = React.useCallback(
    async (id: string, snapshot: Record<string, string>) => {
      const [numStr, dir] = id.split("-") as [string, "across" | "down"];
      inFlightRef.current.add(id);
      try {
        const res = await fetch(`/api/crucigrama/${gameId}/check-word`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number: Number(numStr), direction: dir, cells: snapshot }),
        });
        if (!res.ok) return; // silent -- the manual "Comprobar" button is the backstop
        const data = (await res.json()) as { correct: boolean };
        if (statusRef.current !== "in_progress") return; // grid was revealed/solved mid-flight
        if (data.correct) {
          setSolvedEntries((s) => new Set(s).add(id));
          setPulseEntries((p) => new Set(p).add(id));
          later(() => setPulseEntries((p) => setWithout(p, id)), SOLVED_PULSE_MS);
        } else {
          setWrongEntries((w) => new Set(w).add(id));
          later(() => {
            setWrongEntries((w) => setWithout(w, id));
            const keys = cellsByEntry.get(id) ?? [];
            // keep any cell that also belongs to an already-solved crossing word
            const locked = new Set<string>();
            for (const sid of solvedEntriesRef.current)
              for (const k of cellsByEntry.get(sid) ?? []) locked.add(k);
            setValues((v) => {
              const next = { ...v };
              for (const k of keys) if (!locked.has(k)) delete next[k];
              return next;
            });
            const [fr, fc] = (keys[0] ?? "0,0").split(",").map(Number);
            setDirection(dir);
            focusCell(fr, fc);
          }, WRONG_CLEAR_MS);
        }
      } catch {
        // network error -- ignore, the manual check still works
      } finally {
        inFlightRef.current.delete(id);
      }
    },
    [gameId, cellsByEntry, later, focusCell]
  );

  // Fire a per-word check the moment every cell of a word is filled. A
  // crossing letter can complete two words at once -- both fire. Skips words
  // already solved or with a check in flight, and words that were already
  // complete on the previous render (so it only fires on the transition).
  React.useEffect(() => {
    if (status !== "in_progress") return;
    const complete = new Set<string>();
    for (const [id, keys] of cellsByEntry) {
      if (keys.every((k) => (values[k] ?? "") !== "")) complete.add(id);
    }
    for (const id of complete) {
      if (prevCompleteRef.current.has(id) || solvedEntries.has(id) || inFlightRef.current.has(id)) {
        continue;
      }
      void checkWord(id, values);
    }
    prevCompleteRef.current = complete;
  }, [values, cellsByEntry, status, solvedEntries, checkWord]);

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
      if (cellSet.has(keyOf(pr, pc)) && !solvedCells.has(keyOf(pr, pc))) {
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

  async function handleReveal() {
    setRevealing(true);
    try {
      const res = await fetch(`/api/crucigrama/${gameId}/reveal`, { method: "POST" });
      if (!res.ok) throw new Error("reveal failed");
      const data = (await res.json()) as { solution: Record<string, string> };
      // Cancel any pending per-word animation/clear timers so a scheduled
      // "wrong" wipe can't delete solution letters after the reveal.
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current.clear();
      setWrongEntries(new Set());
      setPulseEntries(new Set());
      // Fill the whole grid with the solution and lock it. `solvedEntries`
      // is kept as-is: the cells of words the player actually found stay
      // emerald, every other (now-revealed) cell turns rose -- the grid and
      // the clue list both read green = found / red = missed.
      setValues(data.solution);
      setStatus("revealed");
      setShowRevealConfirm(false);
      toast({
        title: t("revealedTitle"),
        description: t("revealedStats", {
          found: solvedEntries.size,
          total: puzzle.entries.length,
        }),
      });
    } catch {
      toast({ title: t("errorTitle"), description: t("errorGeneric"), variant: "destructive" });
    } finally {
      setRevealing(false);
    }
  }

  const done = status === "completed" || status === "revealed";
  const revealed = status === "revealed";
  const cellPx = puzzle.width > 12 ? 30 : puzzle.width > 9 ? 36 : 42;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{topic}</h1>
        {status === "completed" && (
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
              const solved = solvedCells.has(k);
              const wrong = wrongCells.has(k);
              const pulse = pulseCells.has(k);
              const cellAnim = reduceMotion
                ? undefined
                : wrong
                  ? { x: [0, -6, 6, -4, 4, 0] }
                  : pulse
                    ? { scale: [1, 1.08, 0.98, 1.03, 1] }
                    : undefined;
              return (
                <motion.div
                  key={k}
                  className="relative"
                  animate={cellAnim}
                  transition={
                    cellAnim ? { duration: wrong ? 0.5 : 0.35, ease: "easeInOut" } : undefined
                  }
                >
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
                    disabled={done || solved}
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
                      "h-full w-full border text-center text-sm font-bold uppercase caret-transparent focus:outline-none",
                      revealed
                        ? !values[k]
                          ? CELL_NEUTRAL // empty on a reloaded revealed game
                          : solved
                            ? CELL_CORRECT // word the player found
                            : CELL_WRONG // now-revealed cell the player missed
                        : solved
                          ? CELL_CORRECT
                          : wrong
                            ? CELL_WRONG
                            : cn(
                                "border-slate-300 text-slate-900 dark:border-slate-600 dark:text-white",
                                isActive
                                  ? "bg-violet-200 dark:bg-violet-500/40"
                                  : "bg-white dark:bg-slate-800"
                              )
                    )}
                  />
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {!done && (
        <div className="space-y-2">
          <Button onClick={handleCheck} disabled={checking || revealing} className="w-full">
            {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("checkButton")}
          </Button>
          <Button
            onClick={() => setShowRevealConfirm(true)}
            disabled={checking || revealing}
            variant="ghost"
            size="sm"
            className="w-full text-slate-500 dark:text-slate-400"
          >
            {t("revealButton")}
          </Button>
        </div>
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
                // On a revealed grid every clue resolves: green if the
                // player had solved that word, red otherwise.
                const ok = solvedEntries.has(entryIdOf(e.number, e.direction))
                  ? true
                  : revealed
                    ? false
                    : resultFor(e.number, e.direction);
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

      {status === "completed" && (
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

      {revealed && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
            {t("revealedTitle")}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t("revealedStats", { found: solvedEntries.size, total: puzzle.entries.length })}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("revealedSubtitle")}
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

      <Dialog
        open={showRevealConfirm}
        onOpenChange={(o) => {
          if (!revealing) setShowRevealConfirm(o);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("revealConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("revealConfirmBody")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleReveal}
              disabled={revealing}
              variant="destructive"
              className="w-full"
            >
              {revealing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("revealConfirmCta")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRevealConfirm(false)}
              disabled={revealing}
              className="w-full"
            >
              {t("revealConfirmCancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
