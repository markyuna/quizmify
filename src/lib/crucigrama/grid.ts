// Deterministic crossword layout: backtracking placement over a small word
// set (5-13 words). No dictionary, no AI. "Criss-cross" / freeform style
// (open grid, not every cell filled) -- the only style that works without a
// large fill dictionary.
//
// Grid letters are accent-stripped and uppercased (é -> E, ç -> C) BUT Ñ is
// kept as its own letter: in Spanish it is a distinct letter and a distinct
// cell, and collapsing it to N would make a shared Ñ/N cell ambiguous to
// render. The accented original stays on the clue-list entry, for display.

const COMBINING_START = 0x0300;
const COMBINING_END = 0x036f;
// U+0303 COMBINING TILDE -- built from its code point, never written as a
// literal combining char (the editing pipeline mangles those).
const TILDE = String.fromCharCode(0x0303);

/**
 * "Café" -> ["C","A","F","E"]; "Mañana" -> ["M","A","Ñ","A","N","A"].
 * Filters combining marks by code point (not a /regex/ literal) -- the
 * escape-sequence form gets mangled by the editing pipeline (see the same
 * note in src/lib/textSimilarity.ts).
 */
export function toGridLetters(raw: string): string[] {
  const nfd = raw.normalize("NFD");
  const out: string[] = [];
  for (let i = 0; i < nfd.length; i++) {
    const ch = nfd[i];
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= COMBINING_START && cp <= COMBINING_END) continue; // drop stray combining mark
    if (nfd[i + 1] === TILDE && (ch === "n" || ch === "N")) {
      out.push("Ñ"); // the tilde itself is skipped on its own next iteration
      continue;
    }
    out.push(ch.toUpperCase());
  }
  return out;
}

const isGridLetter = (l: string) => l === "Ñ" || (l.length === 1 && l >= "A" && l <= "Z");

export type CrosswordEntry = { answer: string; clue: string };

export type PlacedEntry = {
  number: number;
  direction: "across" | "down";
  clue: string;
  answer: string; // accented original, for the clue list
  letters: string[]; // grid letters (accent-free, Ñ kept)
  row: number;
  col: number;
};

export type CrosswordCell = { row: number; col: number; letter: string; number?: number };

export type CrosswordLayout = {
  width: number;
  height: number;
  cells: CrosswordCell[];
  entries: PlacedEntry[];
};

/** Client-safe projection: no solution letters, no answers. */
export type ClientCrossword = {
  width: number;
  height: number;
  cells: { row: number; col: number; number?: number }[];
  entries: {
    number: number;
    direction: "across" | "down";
    clue: string;
    length: number;
    row: number;
    col: number;
  }[];
};

export function toClientCrossword(layout: CrosswordLayout): ClientCrossword {
  return {
    width: layout.width,
    height: layout.height,
    cells: layout.cells.map((c) => ({ row: c.row, col: c.col, number: c.number })),
    entries: layout.entries.map((e) => ({
      number: e.number,
      direction: e.direction,
      clue: e.clue,
      length: e.letters.length,
      row: e.row,
      col: e.col,
    })),
  };
}

type Prepared = { answer: string; clue: string; letters: string[] };
type Working = Prepared & { row: number; col: number; direction: "across" | "down" };

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cellsOf(w: Working) {
  return w.letters.map((letter, i) => ({
    row: w.direction === "down" ? w.row + i : w.row,
    col: w.direction === "across" ? w.col + i : w.col,
    letter,
  }));
}

/**
 * Can `candidate` join the grid without a conflict? Returns the number of
 * intersections it makes with existing words, or -1 if it does not fit.
 */
function scoreFit(candidate: Working, occupied: Map<string, string>): number {
  const cand = cellsOf(candidate);
  let intersections = 0;

  for (const c of cand) {
    const existing = occupied.get(`${c.row},${c.col}`);
    if (existing !== undefined) {
      if (existing !== c.letter) return -1; // letter clash
      intersections++;
      continue; // valid crossing -- perpendicular neighbours are allowed here
    }
    const perp =
      candidate.direction === "across"
        ? [`${c.row - 1},${c.col}`, `${c.row + 1},${c.col}`]
        : [`${c.row},${c.col - 1}`, `${c.row},${c.col + 1}`];
    if (perp.some((p) => occupied.has(p))) return -1; // would sit flush against another word
  }

  const len = candidate.letters.length;
  const before =
    candidate.direction === "across"
      ? `${candidate.row},${candidate.col - 1}`
      : `${candidate.row - 1},${candidate.col}`;
  const after =
    candidate.direction === "across"
      ? `${candidate.row},${candidate.col + len}`
      : `${candidate.row + len},${candidate.col}`;
  if (occupied.has(before) || occupied.has(after)) return -1; // would extend an existing word

  return intersections;
}

function bounds(cells: { row: number; col: number }[]) {
  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  for (const c of cells) {
    if (c.row < minR) minR = c.row;
    if (c.row > maxR) maxR = c.row;
    if (c.col < minC) minC = c.col;
    if (c.col > maxC) maxC = c.col;
  }
  return { minR, maxR, minC, maxC, width: maxC - minC + 1, height: maxR - minR + 1 };
}

function tryLayout(entries: Prepared[], rng: () => number, maxSize: number): Working[] {
  const order = shuffle(entries, rng).sort((a, b) => b.letters.length - a.letters.length);
  const placed: Working[] = [];
  const occupied = new Map<string, string>();
  const paint = (w: Working) => {
    for (const c of cellsOf(w)) occupied.set(`${c.row},${c.col}`, c.letter);
  };

  for (const e of order) {
    if (placed.length === 0) {
      const first: Working = { ...e, row: 0, col: 0, direction: "across" };
      placed.push(first);
      paint(first);
      continue;
    }

    let best: { w: Working; score: number } | null = null;
    for (const p of placed) {
      const pc = cellsOf(p);
      for (let j = 0; j < p.letters.length; j++) {
        for (let i = 0; i < e.letters.length; i++) {
          if (p.letters[j] !== e.letters[i]) continue;
          const direction: "across" | "down" = p.direction === "across" ? "down" : "across";
          const w: Working =
            direction === "across"
              ? { ...e, direction, row: pc[j].row, col: pc[j].col - i }
              : { ...e, direction, row: pc[j].row - i, col: pc[j].col };

          const inter = scoreFit(w, occupied);
          if (inter < 1) continue;

          const b = bounds([...placed.flatMap(cellsOf), ...cellsOf(w)]);
          if (b.width > maxSize || b.height > maxSize) continue;

          const score = inter * 10 - (b.width + b.height); // more crossings, then more compact
          if (!best || score > best.score) best = { w, score };
        }
      }
    }

    if (best) {
      placed.push(best.w);
      paint(best.w);
    }
  }

  return placed;
}

/**
 * @param opts.minWords the difficulty's floor -- returns null if fewer land.
 * @param opts.maxSize   bounding-box ceiling (both width and height).
 * @param opts.seed      makes the multi-seed search deterministic for a game.
 */
export function buildCrossword(
  rawEntries: CrosswordEntry[],
  opts: { maxSize: number; seed: string; attempts?: number; minWords: number }
): CrosswordLayout | null {
  const seen = new Set<string>();
  const entries: Prepared[] = [];
  for (const e of rawEntries) {
    const letters = toGridLetters(e.answer);
    if (letters.length < 3 || letters.length > 12) continue;
    if (!letters.every(isGridLetter)) continue;
    const key = letters.join("");
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ answer: e.answer, clue: e.clue, letters });
  }

  if (entries.length < opts.minWords) return null;

  const attempts = opts.attempts ?? 20;
  let bestPlaced: Working[] = [];
  for (let a = 0; a < attempts; a++) {
    const rng = mulberry32(hashSeed(opts.seed) + a * 0x9e3779b1);
    const placed = tryLayout(entries, rng, opts.maxSize);
    if (placed.length > bestPlaced.length) bestPlaced = placed;
    if (bestPlaced.length === entries.length) break;
  }
  if (bestPlaced.length < opts.minWords) return null;

  // Normalise coords to 0-based.
  const b = bounds(bestPlaced.flatMap(cellsOf));
  const placed = bestPlaced.map((w) => ({ ...w, row: w.row - b.minR, col: w.col - b.minC }));
  const width = b.width;
  const height = b.height;

  // Standard numbering: each word-start cell gets the next number, in
  // row-major reading order; an across and a down word sharing a start cell
  // share the number.
  const starts = [...placed].sort((x, y) => x.row - y.row || x.col - y.col);
  const numberByKey = new Map<string, number>();
  let n = 0;
  for (const w of starts) {
    const key = `${w.row},${w.col}`;
    if (!numberByKey.has(key)) numberByKey.set(key, ++n);
  }

  const entriesOut: PlacedEntry[] = placed
    .map((w) => ({
      number: numberByKey.get(`${w.row},${w.col}`) as number,
      direction: w.direction,
      clue: w.clue,
      answer: w.answer,
      letters: w.letters,
      row: w.row,
      col: w.col,
    }))
    .sort((x, y) => x.number - y.number || (x.direction === "across" ? -1 : 1));

  const cellMap = new Map<string, CrosswordCell>();
  for (const w of placed) {
    for (const c of cellsOf(w)) {
      const key = `${c.row},${c.col}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, { row: c.row, col: c.col, letter: c.letter, number: numberByKey.get(key) });
      }
    }
  }

  return { width, height, cells: [...cellMap.values()], entries: entriesOut };
}
