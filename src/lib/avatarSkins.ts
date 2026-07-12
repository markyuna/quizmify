import type { AvatarTier, AvatarGeometry, AvatarAccessory } from "@/lib/avatar";

/**
 * A skin overrides some or all of a level-derived AvatarTier's visual
 * fields. Unlike tiers (which progress with level), skins are level
 * -independent Pro cosmetics -- equip any of them at level 1 or level 50.
 * Only 4 example entries for now, enough to prove out the architecture;
 * adding a 5th later is just another array entry, no code changes.
 */
export type AvatarSkin = {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  geometry: AvatarGeometry;
  accessory: AvatarAccessory;
};

export const AVATAR_SKINS: AvatarSkin[] = [
  {
    id: "obsidian",
    name: "Obsidian",
    primaryColor: "#1e1b2e",
    accentColor: "#fbbf24",
    geometry: "icosahedron",
    accessory: "ring",
  },
  {
    id: "aurora",
    name: "Aurora",
    primaryColor: "#22d3ee",
    accentColor: "#f472b6",
    geometry: "icosahedron",
    accessory: "stars",
  },
  {
    id: "sakura",
    name: "Sakura",
    primaryColor: "#fda4af",
    accentColor: "#fecdd3",
    geometry: "sphere",
    accessory: "ring",
  },
  {
    id: "gold",
    name: "Gold",
    primaryColor: "#eab308",
    accentColor: "#fef08a",
    geometry: "octahedron",
    accessory: "shards",
  },
];

export function getAvatarSkinById(skinId: string | null | undefined): AvatarSkin | null {
  if (!skinId) return null;
  return AVATAR_SKINS.find((skin) => skin.id === skinId) ?? null;
}

/** Layers a skin's fields over a level-derived tier. A null skin is a no-op. */
export function applyAvatarSkin(tier: AvatarTier, skin: AvatarSkin | null): AvatarTier {
  if (!skin) return tier;

  return {
    ...tier,
    primaryColor: skin.primaryColor,
    accentColor: skin.accentColor,
    geometry: skin.geometry,
    accessory: skin.accessory,
  };
}
