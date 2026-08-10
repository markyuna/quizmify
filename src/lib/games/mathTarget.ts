import { GuestGameKey, registerGuestGame } from "@/lib/guestPlay";

const SMALL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PLAQUES = [25, 50, 75, 100];
const OPERAND_COUNT = 5;

export type MathOp = "+" | "-" | "*" | "/";

/**
 * a op b, enforcing the classic "Compte est bon" rules: no negative
 * intermediate results, no fractions. Returns null for anything illegal
 * (including divide-by-zero) rather than throwing, since both the daily
 * synthesis below and grade() below treat "illegal" as just another
 * outcome to route around, not an error.
 */
export function applyMathOp(a: number, b: number, op: MathOp): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a > b ? a - b : null;
    case "*":
      return a * b;
    case "/":
      return b !== 0 && a % b === 0 ? a / b : null;
  }
}

// Deterministic PRNG (mulberry32) seeded from the date hash -- same
// "every guest sees the same challenge today" requirement as the other 2
// games, but this one needs several draws (pool + synthesis), not just one
// array index, hence a real generator instead of a single hash % length.
function seededRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashDateKey(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickOne<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

function generatePool(rand: () => number): number[] {
  const plaque = pickOne(PLAQUES, rand);
  const smalls = Array.from({ length: OPERAND_COUNT - 1 }, () => pickOne(SMALL_NUMBERS, rand));
  return [plaque, ...smalls];
}

const ALL_OPS: readonly MathOp[] = ["+", "-", "*", "/"];

/**
 * Combines 2-3 random pairs from the pool with whichever operator happens
 * to be legal, and returns whatever's left as the target. This is run once
 * at generation time only to *pick* a target -- the derivation itself is
 * thrown away, never stored or compared against. It exists purely to
 * guarantee at least one real solution exists for today's pool, the same
 * way the real TV show's targets are always reachable from that round's
 * numbers (even if not everyone finds the path).
 */
function synthesizeTarget(pool: number[], rand: () => number): number {
  let available = [...pool];
  const combineAttempts = 2 + Math.floor(rand() * 2);

  for (let i = 0; i < combineAttempts && available.length >= 2; i++) {
    const indexA = Math.floor(rand() * available.length);
    let indexB = Math.floor(rand() * available.length);
    while (indexB === indexA) indexB = Math.floor(rand() * available.length);

    const a = available[indexA];
    const b = available[indexB];
    const shuffledOps = [...ALL_OPS].sort(() => rand() - 0.5);

    for (const op of shuffledOps) {
      // Try the larger operand first for -/÷ so a legal (positive,
      // integer) result is more often found -- order doesn't matter for
      // the guest's own derivation, only for picking a solvable target here.
      const [hi, lo] = a >= b ? [a, b] : [b, a];
      const result = applyMathOp(hi, lo, op);
      if (result !== null) {
        available = available.filter((_, idx) => idx !== indexA && idx !== indexB);
        available.push(result);
        break;
      }
    }
  }

  return available[available.length - 1] ?? pool[0];
}

type MathTargetPayload = { operands: number[]; target: number };

export type MathStep = { a: number; b: number; op: MathOp; result: number };
type MathTargetAnswer = { steps: unknown; finalValue: unknown };

function isValidStepShape(step: unknown): step is MathStep {
  if (!step || typeof step !== "object") return false;
  const s = step as Record<string, unknown>;
  return (
    typeof s.a === "number" &&
    typeof s.b === "number" &&
    typeof s.result === "number" &&
    (ALL_OPS as readonly string[]).includes(s.op as string)
  );
}

/**
 * Replays a guest's claimed derivation against the day's operand pool as a
 * multiset (so duplicate small numbers, e.g. two 5s, are handled correctly
 * without needing to track which physical tile was which) and checks that
 * `claimedFinalValue` is actually a tile still on the table afterwards --
 * either an original operand never touched, or the result of the final
 * step. This is the only thing that decides correctness; the client's own
 * bookkeeping is never trusted.
 */
function isDerivationValid(operands: number[], steps: MathStep[], claimedFinalValue: number): boolean {
  const available = new Map<number, number>();
  for (const n of operands) available.set(n, (available.get(n) ?? 0) + 1);

  const consume = (value: number): boolean => {
    const count = available.get(value) ?? 0;
    if (count <= 0) return false;
    available.set(value, count - 1);
    return true;
  };

  for (const step of steps) {
    if (!consume(step.a) || !consume(step.b)) return false;

    const computed = applyMathOp(step.a, step.b, step.op);
    if (computed === null || computed !== step.result) return false;

    available.set(step.result, (available.get(step.result) ?? 0) + 1);
  }

  return consume(claimedFinalValue);
}

registerGuestGame({
  gameKey: GuestGameKey.math_target,

  generateChallenge(dateKey): MathTargetPayload {
    const rand = seededRandom(hashDateKey(dateKey));
    const operands = generatePool(rand);
    const target = synthesizeTarget(operands, rand);
    return { operands, target };
  },

  // Nothing to hide here -- the target and the operands *are* the puzzle,
  // both shown to the guest from the start. What stays hidden until
  // registration is only whether their derivation actually hit it (see
  // grade() below and the shared submit route).
  toClientChallenge(payload) {
    const { operands, target } = payload as MathTargetPayload;
    return { operands, target };
  },

  grade(payload, answer) {
    const { operands, target } = payload as MathTargetPayload;
    const { steps: rawSteps, finalValue: rawFinalValue } = (answer ?? {}) as Partial<MathTargetAnswer>;

    const steps = Array.isArray(rawSteps) ? rawSteps.filter(isValidStepShape) : [];
    const finalValue = typeof rawFinalValue === "number" && Number.isInteger(rawFinalValue) ? rawFinalValue : null;

    const valid = finalValue !== null && isDerivationValid(operands, steps, finalValue);
    const reachedValue = valid ? finalValue : null;
    const isCorrect = valid && finalValue === target;

    return {
      isCorrect,
      resultPayload: {
        target,
        operands,
        steps: valid ? steps : [],
        reachedValue,
        distance: reachedValue !== null ? Math.abs(reachedValue - target) : null,
      },
    };
  },
});
