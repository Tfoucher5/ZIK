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

// La hiérarchie se lit sur la tenue : costume noir pour le fondateur, costume et cravate du pôle pour la direction.
export function tenue(f, id, couleur) {
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
