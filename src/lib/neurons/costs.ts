// Static Neuron cost per unlockable game -- deliberately not part of
// GAMES_CATALOG (src/lib/games/catalog.ts), which is reserved for the 3
// free guest games by design (see that file's own history: Puzzle du Jour
// was removed from it for exactly this reason -- Pro/auth-only games don't
// belong there). One entry today; add more gameKeys here as they come, no
// need for anything fancier until there's a second one.
export const NEURON_UNLOCK_COSTS = {
  puzzleDuJour: 50,
} as const;

export type NeuronUnlockGameKey = keyof typeof NEURON_UNLOCK_COSTS;

export function isNeuronUnlockGameKey(value: string): value is NeuronUnlockGameKey {
  return value in NEURON_UNLOCK_COSTS;
}

// Direct per-play debit, not a purchasable ticket like NEURON_UNLOCK_COSTS
// above -- Morpion charges this at game-creation time via its own
// updateMany decrement (see /api/morpion/route.ts), never through
// /api/neurons/unlock or a NeuronUnlock row. Kept out of
// NEURON_UNLOCK_COSTS on purpose: adding it there would let a user "buy" a
// NeuronUnlock ticket for morpion through the generic unlock endpoint that
// Morpion's own route never checks for -- Neurons spent, ticket never
// consumed.
export const MORPION_COST_PER_GAME = 50;

// Same kind of direct per-play debit as MORPION_COST_PER_GAME -- charged in
// the game-creation transaction (POST /api/akinator) via an updateMany
// decrement, logged as a `spend_akinator` NeuronTransaction. Not a
// NeuronUnlock ticket.
export const AKINATOR_COST_PER_GAME = 50;
