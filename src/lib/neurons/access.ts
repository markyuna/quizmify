import { NEURON_UNLOCK_COSTS } from "./costs";

// Pure and Prisma-free on purpose -- shared as-is between server components
// (GameCarousel.tsx) and client components (CategorySidebar.tsx,
// PuzzleDuJourCreation.tsx) without pulling any DB dependency into the
// client bundle.
export type PuzzleDuJourAccessState =
  | { kind: "pro" }
  | { kind: "ticket_available" }
  | { kind: "can_purchase" }
  | { kind: "insufficient_balance"; missing: number };

export function resolvePuzzleDuJourAccess(params: {
  isPro: boolean;
  hasAvailableTicket: boolean;
  neuronsBalance: number;
}): PuzzleDuJourAccessState {
  if (params.isPro) return { kind: "pro" };
  if (params.hasAvailableTicket) return { kind: "ticket_available" };

  const cost = NEURON_UNLOCK_COSTS.puzzleDuJour;
  if (params.neuronsBalance >= cost) return { kind: "can_purchase" };

  return { kind: "insufficient_balance", missing: cost - params.neuronsBalance };
}
