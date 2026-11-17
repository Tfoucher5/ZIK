const PEAUX = [
  "#f1c7a5",
  "#d9a37e",
  "#a86f4c",
  "#6e4a33",
  "#f5d6bd",
  "#c68863",
  "#8d5a3b",
  "#e6b48f",
];
const CHEVEUX = [
  "#2b1d14",
  "#5a3a22",
  "#c9a063",
  "#111111",
  "#8a6a4a",
  "#a0522d",
];
const HAUTS = [
  "#e2e8f0",
  "#1e293b",
  "#f59e0b",
  "#0ea5e9",
  "#a3e635",
  "#f472b6",
  "#64748b",
  "#fef3c7",
  "#7c3aed",
  "#14b8a6",
];
const BAS = ["#232a3a", "#3b3f46", "#2f3b52", "#4a3b2f", "#1d1f24", "#5b6b8a"];
const BASKETS = ["#f4f4f5", "#1f2937", "#7c2d12", "#e11d48", "#e5e7eb"];
const DIRECTION = new Set(["ceo", "cfo", "coo", "cpo", "cto", "cmo"]);

// Tirage stable : une même personne garde le même look d'une ouverture à l'autre.
export function tirage(graine) {
  let h = 2166136261;
  for (const c of graine) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (t, sel = 0) => t[((h >>> 0) + sel * 7919) % t.length];
}

// Tenue de métier des PNJ : haut, bas, et tablier, gilet ou chariot. Les autres sont en civil.
const METIERS = {
  cuisinier: { haut: "#f8fafc", bas: "#1f2937", tablier: "#e5e7eb" },
  serveur: { haut: "#111827", bas: "#111827", tablier: "#7c2d12" },
  barista: { haut: "#3f2a1d", tablier: "#a16207" },
  vigile: { haut: "#111827", bas: "#111827", gilet: "#f97316" },
  veilleur: { haut: "#111827", bas: "#111827", gilet: "#f97316" },
  coach: { style: "tshirt", haut: "#dc2626", bas: "#111111" },
  sportif: { style: "tshirt", bas: "#1f2937" },
  entretien: { haut: "#2563eb", bas: "#1e3a8a", chariot: true },
  menage: { haut: "#2563eb", bas: "#1e3a8a", chariot: true },
  livreur: { haut: "#78350f", bas: "#44403c", gilet: "#facc15" },
  reception: { haut: "#1e293b", bas: "#1e293b" },
  assistante: { haut: "#334155", bas: "#1c1f26" },
};

function tenuePnj(f, id) {
  const pick = tirage(id);
  return {
    rang: "pnj",
    peau: pick(PEAUX, 2),
    cheveux: pick(CHEVEUX, 3),
    longs: pick([true, false], 4),
    lunettes: pick([true, false, false, false], 8),
    style: pick(["sweat", "tshirt"], 5),
    haut: pick(HAUTS, 1),
    bas: pick(BAS, 4),
    chaussures: pick(BASKETS, 6),
    taille: 0.94 + pick([0, 0.03, 0.06, 0.09], 9),
    ...(METIERS[f.pnj] && { style: "uniforme" }),
    ...METIERS[f.pnj],
  };
}

// La hiérarchie se lit sur la tenue : costume noir pour le fondateur, costume et cravate du pôle pour la direction.
export function tenue(f, id, couleur) {
  if (f.pnj) return tenuePnj(f, id);
  const pick = tirage(f.nom + id);
  const role = String(f.role ?? "").toLowerCase();
  const rang =
    role === "fondateur"
      ? "fondateur"
      : DIRECTION.has(role)
        ? "chef"
        : "equipe";
  const base = {
    rang,
    peau: tirage(id)(PEAUX),
    cheveux: pick(CHEVEUX, 3),
    longs: !!f.f,
    lunettes: !!f.l,
  };
  if (rang === "equipe") {
    const style = pick(["sweat", "tshirt"], 5);
    return {
      ...base,
      style,
      haut: f.haut ?? pick(HAUTS, 1),
      bas: pick(BAS, 4),
      chaussures: pick(BASKETS, 6),
      taille: 1,
    };
  }
  return {
    ...base,
    style: "costume",
    haut: rang === "fondateur" ? "#0d0d10" : (f.haut ?? "#1f2937"),
    bas: rang === "fondateur" ? "#0d0d10" : "#1c1f26",
    chemise: "#f8fafc",
    cravate: rang === "fondateur" ? "#0d0d10" : couleur,
    chaussures: "#0b0b0d",
    taille: 1.07,
  };
}
