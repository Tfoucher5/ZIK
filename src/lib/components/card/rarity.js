// Barème v1 (spec docs/specs/cartes.md, section 3) : rank Deezer minimum par rareté.
export const RARITIES = {
  common: { label: "Commune", min: 0 },
  uncommon: { label: "Peu commune", min: 700_000 },
  rare: { label: "Rare", min: 800_000 },
  epic: { label: "Épique", min: 880_000 },
  legendary: { label: "Légendaire", min: 940_000 },
  mythic: { label: "Mythique", min: 975_000 },
};

export const RARITY_ORDER = Object.keys(RARITIES);

export function rarityFromRank(rank) {
  return RARITY_ORDER.findLast((key) => rank >= RARITIES[key].min);
}
