export type TrophyShape = "cup" | "medal" | "star" | "crown";

/**
 * Perfect scores always get the trophy cup. Streaks escalate through
 * progressively fancier shapes so a longer streak visibly looks more
 * impressive, both in the 3D scene and the flat dashboard grid icon.
 */
export function getTrophyShape(kind: "perfect" | "streak", streakCount: number | null | undefined): TrophyShape {
  if (kind === "perfect") return "cup";

  const count = streakCount ?? 0;
  if (count >= 30) return "crown";
  if (count >= 7) return "star";
  return "medal";
}
