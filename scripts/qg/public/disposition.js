// Répartition des agents de /agents par pôle, sans dépendance à three.js.

// Équipe de /agents (premier mot : « Produit », « Technique »…, ou « board », « renforts ») → pôle.
const POLES = {
  produit: "produit",
  technique: "tech",
  opérations: "operations",
  marketing: "marketing",
  argent: "argent",
};
const NOMS = {
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

// Liste /agents → membres de chaque pôle, du board et le reste.
// chef-tech, chef-produit… sont les chefs des pôles, à leur bureau de la Direction (chef-projet est un membre).
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
