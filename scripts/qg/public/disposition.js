// Répartition des agents par pôle et place des pôles sur le plateau, sans dépendance à three.js.

// Équipe de /agents (premier mot : « Produit », « Technique »…, ou « board », « renforts ») → pôle.
const POLES = {
  produit: "produit",
  technique: "tech",
  opérations: "operations",
  marketing: "marketing",
  argent: "argent",
};
export const NOMS = {
  produit: "Produit & design",
  tech: "Technique",
  operations: "Opérations",
  marketing: "Marketing & ventes",
  argent: "Argent",
};
const equipe = (e) =>
  String(e ?? "")
    .split(/[\s&,]/)[0]
    .toLowerCase();

// Rangées de bureaux : bord du premier bureau, sens de croissance, axe z, colonnes au plus.
// La rangée « a » n'a pas de limite : elle pousse l'aile ouest du bâtiment.
const RANGEES = {
  a: { x: -3.4, sens: -1, z: -1.5, max: Infinity },
  b: { x: -12.4, sens: -1, z: 3, max: 2 },
  c: { x: 6, sens: 1, z: -1.5, max: 3 },
  d: { x: 5.9, sens: 1, z: 3, max: 4 },
};
const PREFEREE = {
  produit: "a",
  tech: "a",
  argent: "b",
  operations: "c",
  marketing: "d",
};
const COLONNE = 1.6;
// Bureau du chef au bout de la rangée, puis une allée avant le pôle suivant.
const BOUT = 3;

// Deux postes par membre (2× l'effectif) ; un pôle trop long pour sa rangée part au bout de la rangée « a ».
export function disposer(effectifs) {
  const curseur = Object.fromEntries(
    Object.entries(RANGEES).map(([k, r]) => [k, r.x]),
  );
  const poles = {};
  for (const id of Object.keys(PREFEREE)) {
    const cols = Math.max(effectifs[id] ?? 0, 1);
    const r = cols > RANGEES[PREFEREE[id]].max ? "a" : PREFEREE[id];
    const { sens, z } = RANGEES[r];
    poles[id] = { x: curseur[r], sens, z, cols };
    curseur[r] += sens * (cols * COLONNE + BOUT);
  }
  return { poles, ouest: Math.min(-20, Math.floor(curseur.a)) };
}

// Liste /agents → membres de chaque pôle, du board et le reste.
// chef-tech, chef-produit… sont les chefs des pôles, déjà à leur bureau (chef-projet est un membre).
export function repartir(agents) {
  const equipes = Object.fromEntries(Object.keys(NOMS).map((p) => [p, []]));
  const board = [];
  const autres = [];
  const fiches = new Map();
  for (const a of agents) {
    if (!a?.id || (a.id.startsWith("chef-") && NOMS[a.id.slice(5)])) continue;
    fiches.set(a.id, a);
    const pole = POLES[equipe(a.equipe)];
    if (pole) equipes[pole].push(a.id);
    else if (equipe(a.equipe) === "board") board.push(a.id);
    else autres.push(a.id);
  }
  return { equipes, board, autres, fiches };
}

// Repli tant que /agents n'existe pas : l'organigramme du CLAUDE.md, au format de /agents.
export function repli(org) {
  const agents = [];
  for (const c of org.chefs ?? [])
    for (const id of c.equipe)
      agents.push({ id, equipe: NOMS[c.id] ?? "renforts" });
  for (const id of org.board ?? [])
    if (!id.includes("*")) agents.push({ id, equipe: "board" });
  return agents;
}
