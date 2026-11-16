// Répartition des agents par pôle et plan des bureaux, sans dépendance à three.js.

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

// Un bureau : { x, z, a }, a = angle du poste (0 : chaise au sud, l'agent regarde le nord).
const Q = Math.PI / 2;
const serie = (n, f) => Array.from({ length: n }, (_, k) => f(k)).flat();
// Îlot face à face : n paires de bureaux dos à dos le long de x.
const face = (x, z, n) =>
  serie(n, (k) => [
    { x: x + k * 1.6, z, a: Math.PI },
    { x: x + k * 1.6, z: z + 0.85, a: 0 },
  ]);
// Le même tourné de 90° : les paires s'alignent le long de z.
const tourne = (x, z, n) =>
  serie(n, (k) => [
    { x, z: z + k * 1.6, a: -Q },
    { x: x + 0.85, z: z + k * 1.6, a: Q },
  ]);
// Bureaux en L : deux côte à côte, puis le retour vers le nord, tous tournés vers l'intérieur du L.
const equerre = (x, z, n) =>
  serie(n, (k) =>
    k < 2
      ? { x: x + k * 1.6, z, a: 0 }
      : { x: x + 2.8, z: z - 0.4 - (k - 2) * 1.6, a: Q },
  );
// Rangée contre un mur à l'ouest, l'agent face au mur.
const contreMur = (x, z, n) => serie(n, (k) => ({ x, z: z + k * 1.6, a: Q }));

// L'espace de chaque pôle : îlots remplis dans l'ordre, décor (les chefs sont à la Direction).
// Décor : ["plante", x, z], ["etagere", x, z, angle, longueur], ["cloison", x0, z0, x1, z1] (cloison basse).
const ESPACES = {
  tech: {
    titre: [-24.2, -1],
    ilots: [tourne(-26.6, -2.9, 3), tourne(-22.6, -2.9, 3)],
    deco: [
      ["plante", -24.2, -4],
      ["etagere", -24.2, 5.5, 0, 2.4],
      ["cloison", -20, 2.7, -20, 4.8],
      ["plante", -20, 2.2],
      ["plante", -20, 5.3],
    ],
  },
  produit: {
    titre: [-12.5, -1.4],
    ilots: [face(-18.2, -2.3, 3), tourne(-12, -2.6, 2), equerre(-8, 0.3, 4)],
    deco: [
      ["etagere", -13.65, -1.8, Q, 2.2],
      ["plante", -9.4, -1],
      ["plante", -19.5, 0.6],
    ],
  },
  marketing: {
    titre: [-15.6, 2.9],
    ilots: [face(-18.6, 3.5, 2), tourne(-14.2, 3.2, 2)],
    deco: [
      ["cloison", -19.2, 2.1, -16.6, 2.1],
      ["cloison", -15, 2.1, -12.4, 2.1],
    ],
  },
  operations: {
    titre: [9.5, -1.8],
    ilots: [contreMur(5.5, -2.4, 2), face(7.9, -2.3, 3)],
    deco: [
      ["plante", 12.6, -3],
      ["cloison", 7, 0.75, 10, 0.75],
    ],
  },
  argent: {
    titre: [10.2, 3.3],
    ilots: [tourne(7.5, 2.2, 2), equerre(10.8, 4.4, 3)],
    deco: [
      ["plante", 9.9, 2.4],
      ["plante", 15.3, 5.4],
    ],
  },
};

// Postes des renforts (agents sans pôle), à l'est.
export const RENFORTS = tourne(14.8, 0.7, 2);

// Bord ouest du plateau sans extension ; au-delà, une allée de bureaux par pôle, du nord au sud.
export const OUEST = -28;
const ALLEES = ["tech", "produit", "marketing", "operations", "argent"];
const allee = (id, k) => ({
  x: OUEST - 1.4 - k * 1.6,
  z: -4.5 + 2.1 * ALLEES.indexOf(id) + 0.7,
  a: 0,
});

// Emprise d'un bureau et de sa chaise [x0, z0, x1, z1], côté chaise compris.
export function emprise({ x, z, a }) {
  const [s, c] = [Math.round(Math.sin(a)), Math.round(Math.cos(a))];
  if (c) {
    const [z0, z1] = [z - 0.4 * c, z + 1.1 * c].sort((u, v) => u - v);
    return [x - 0.8, z0, x + 0.8, z1];
  }
  const [x0, x1] = [x - 0.4 * s, x + 1.1 * s].sort((u, v) => u - v);
  return [x0, z - 0.8, x1, z + 0.8];
}

const boite = (liste) => {
  const r = liste.map(emprise);
  return [
    Math.min(...r.map((e) => e[0])) - 0.3,
    Math.min(...r.map((e) => e[1])) - 0.3,
    Math.max(...r.map((e) => e[2])) + 0.3,
    Math.max(...r.map((e) => e[3])) + 0.3,
  ];
};

// Deux postes par membre (au moins deux). Chaque place ne dépend que de son rang dans le pôle :
// un recrutement ajoute des postes sans déplacer ceux qui existent. L'espace plein, le pôle
// continue dans son allée de l'extension ouest, qui agrandit le bâtiment.
export function disposer(effectifs) {
  let plusLong = 0;
  const poles = {};
  for (const [id, e] of Object.entries(ESPACES)) {
    const n = Math.max((effectifs[id] ?? 0) * 2, 2);
    const ilots = [];
    const postes = [];
    for (const ilot of e.ilots) {
      const pris = ilot.slice(0, n - postes.length);
      if (pris.length) ilots.push(boite(pris));
      postes.push(...pris);
    }
    const reste = n - postes.length;
    if (reste > 0) {
      const ext = serie(reste, (k) => allee(id, k));
      ilots.push(boite(ext));
      postes.push(...ext);
      plusLong = Math.max(plusLong, reste);
    }
    const { titre, deco } = e;
    poles[id] = { titre, deco, ilots, postes };
  }
  const ouest = plusLong ? Math.floor(OUEST - 1.2 - plusLong * 1.6) : OUEST;
  return { poles, ouest };
}

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
