export type AvatarGeometry = "sphere" | "icosahedron" | "octahedron";
export type AvatarAccessory = "none" | "ring" | "flame" | "shards" | "stars";

export type AvatarTier = {
  id: string;
  minLevel: number;
  label: string;
  primaryColor: string;
  accentColor: string;
  geometry: AvatarGeometry;
  accessory: AvatarAccessory;
};

/**
 * The default (free) tier set, keyed purely off level. A future premium
 * "skin" is just an alternate AvatarTier[] swapped in for
 * getAvatarTierForLevel's second argument -- no schema change needed until
 * skin *selection* is actually built (that will need a User.selectedSkinId
 * column + a picker UI, deliberately not added yet per scope).
 */
export const DEFAULT_AVATAR_TIERS: AvatarTier[] = [
  {
    id: "seed",
    minLevel: 1,
    label: "Seed",
    primaryColor: "#94a3b8",
    accentColor: "#cbd5e1",
    geometry: "sphere",
    accessory: "none",
  },
  {
    id: "spark",
    minLevel: 2,
    label: "Spark",
    primaryColor: "#818cf8",
    accentColor: "#a5b4fc",
    geometry: "sphere",
    accessory: "ring",
  },
  {
    id: "flame",
    minLevel: 3,
    label: "Flame",
    primaryColor: "#fb923c",
    accentColor: "#fbbf24",
    geometry: "octahedron",
    accessory: "flame",
  },
  {
    id: "crystal",
    minLevel: 5,
    label: "Crystal",
    primaryColor: "#22d3ee",
    accentColor: "#c084fc",
    geometry: "icosahedron",
    accessory: "shards",
  },
  {
    id: "cosmic",
    minLevel: 10,
    label: "Cosmic",
    primaryColor: "#a855f7",
    accentColor: "#f472b6",
    geometry: "icosahedron",
    accessory: "stars",
  },
];

export function getAvatarTierForLevel(
  level: number,
  tiers: AvatarTier[] = DEFAULT_AVATAR_TIERS
): AvatarTier {
  const sorted = [...tiers].sort((a, b) => a.minLevel - b.minLevel);
  let match = sorted[0];

  for (const tier of sorted) {
    if (level >= tier.minLevel) {
      match = tier;
    }
  }

  return match;
}
