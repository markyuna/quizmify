// Real-money Neuron packages sold through Stripe checkout (EUR). Prices are
// in cents (the smallest currency unit) so there is never any float math --
// Stripe wants `unit_amount` in cents anyway.
//
// This is the *buy* side; src/lib/neurons/costs.ts is the *spend* side
// (unlock/per-game Neuron costs). Kept separate on purpose.

export const NEURON_PACKAGES = {
  SMALL: { neurons: 100, amountCents: 99 },
  MEDIUM: { neurons: 250, amountCents: 249 },
  LARGE: { neurons: 500, amountCents: 499 },
  XL: { neurons: 1000, amountCents: 999 },
} as const;

/** Display order, cheapest first. */
export const NEURON_PACKAGE_KEYS = ["SMALL", "MEDIUM", "LARGE", "XL"] as const;

export type NeuronPackageKey = (typeof NEURON_PACKAGE_KEYS)[number];

export function isNeuronPackageKey(key: unknown): key is NeuronPackageKey {
  return typeof key === "string" && (NEURON_PACKAGE_KEYS as readonly string[]).includes(key);
}

export function getNeuronPackage(key: NeuronPackageKey): (typeof NEURON_PACKAGES)[NeuronPackageKey] {
  return NEURON_PACKAGES[key];
}
