// L'équipe de ZIK : un prénom et un style par agent. f = cheveux longs, l = lunettes.
export const EQUIPE = {
  theo: { nom: "Théo", role: "fondateur", haut: "#111827" },
  ceo: { nom: "Claire", role: "CEO", f: 1, haut: "#f5f5f4" },
  argent: { nom: "Marc", role: "CFO", l: 1, haut: "#1e3a5f" },
  operations: { nom: "Sophie", role: "COO", f: 1, haut: "#7c2d12" },
  produit: { nom: "Julien", role: "CPO", haut: "#4c1d95" },
  tech: { nom: "Karim", role: "CTO", l: 1, haut: "#0f172a" },
  marketing: { nom: "Inès", role: "CMO", f: 1, haut: "#be185d" },
  analyste: { nom: "Hugo", role: "analyste", l: 1 },
  offres: { nom: "Camille", role: "offres", f: 1 },
  "chef-projet": { nom: "Nadia", role: "chef de projet", f: 1 },
  recette: { nom: "Lucas", role: "recette" },
  support: { nom: "Emma", role: "support", f: 1 },
  idees: { nom: "Chloé", role: "idées", f: 1, l: 1 },
  ux: { nom: "Léa", role: "UX", f: 1 },
  ui: { nom: "Yanis", role: "UI" },
  redaction: { nom: "Manon", role: "rédaction", f: 1, l: 1 },
  architecte: { nom: "Antoine", role: "architecte", l: 1 },
  dev: { nom: "Mehdi", role: "dev" },
  "test-writer": { nom: "Sarah", role: "tests", f: 1 },
  reviewer: { nom: "Paul", role: "relecture", l: 1 },
  incident: { nom: "Bastien", role: "incidents" },
  seo: { nom: "Jade", role: "SEO", f: 1 },
  contenu: { nom: "Louis", role: "contenus" },
  prospection: { nom: "Zoé", role: "commerciale", f: 1 },
  avocat: { nom: "Victor", role: "avocat", l: 1, haut: "#1f2937" },
  "client-pro": { nom: "Gérard", role: "patron de bar", haut: "#78350f" },
};

const RENFORTS = [
  { nom: "Alex" },
  { nom: "Lina", f: 1 },
  { nom: "Samir" },
  { nom: "Eva", f: 1 },
  { nom: "Tom", l: 1 },
  { nom: "Maya", f: 1 },
  { nom: "Rayan" },
  { nom: "Jules", l: 1 },
];

// Un agent hors de la table ou une copie reçoit un prénom stable tiré de son identifiant.
export function fiche(id, role) {
  if (EQUIPE[id]) return EQUIPE[id];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { ...RENFORTS[h % RENFORTS.length], role };
}
