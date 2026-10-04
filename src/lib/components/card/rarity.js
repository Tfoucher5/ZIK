// Barème v1 (spec docs/specs/cartes.md, section 3) : rank Deezer minimum par rareté.
// exploit : conditions pour gagner la carte (spec section 1) — temps max en ms
// selon le mode et nombre de comptes actifs dans la room.
export const RARITIES = {
  common: { label: "Commune", min: 0, exploit: { players: 2 } },
  uncommon: { label: "Peu commune", min: 700_000, exploit: { players: 2 } },
  rare: { label: "Rare", min: 800_000, exploit: { players: 2 } },
  epic: {
    label: "Épique",
    min: 880_000,
    exploit: { classic: 15_000, qcm: 6_000, players: 3 },
  },
  legendary: {
    label: "Légendaire",
    min: 940_000,
    exploit: { classic: 10_000, qcm: 4_000, players: 3 },
  },
  mythic: {
    label: "Mythique",
    min: 975_000,
    exploit: { classic: 6_000, qcm: 3_000, players: 4, notOwnPlaylist: true },
  },
};

export const RARITY_ORDER = Object.keys(RARITIES);

export function rarityFromRank(rank) {
  return RARITY_ORDER.findLast((key) => rank >= RARITIES[key].min);
}
