// Static Neuron cost per unlockable game -- deliberately not part of
// GAMES_CATALOG (src/lib/games/catalog.ts), which is reserved for the 3
// free guest games by design (see that file's own history: Puzzle du Jour
// was removed from it for exactly this reason -- Pro/auth-only games don't
// belong there). One entry today; add more gameKeys here as they come, no
// need for anything fancier until there's a second one.
export const NEURON_UNLOCK_COSTS = {
  puzzleDuJour: 100,
} as const;

export type NeuronUnlockGameKey = keyof typeof NEURON_UNLOCK_COSTS;

export function isNeuronUnlockGameKey(value: string): value is NeuronUnlockGameKey {
  return value in NEURON_UNLOCK_COSTS;
}
