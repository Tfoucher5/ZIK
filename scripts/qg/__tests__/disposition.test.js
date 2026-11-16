import { describe, expect, it } from "vitest";
import {
  OUEST,
  RENFORTS,
  disposer,
  emprise,
  repartir,
  repli,
} from "../public/disposition.js";

const ACTUEL = { produit: 7, tech: 5, operations: 3, marketing: 4, argent: 2 };
const PLEIN = {
  produit: 12,
  tech: 12,
  operations: 12,
  marketing: 12,
  argent: 12,
};

// Espaces communs et passages tracés ailleurs (espaces.js, nord.js, plan.js) : aucun bureau dessus.
const COMMUNS = {
  "allée nord et portes des bureaux": [-20, -4.5, 17, -3.45],
  "noyau (toilettes, ascenseurs, escalier)": [-2, -3.2, 5, 2],
  accueil: [-2, 2, 6, 6],
  "La Discothèque": [-10, 2.4, -4, 5.6],
  "porte du Refrain": [-3.6, 5, -2, 6],
  "machine à café": [5.1, 1.1, 6.1, 2.5],
  "porte du Tempo": [16.2, 4, 17, 5.4],
  "passage vers La Grosse Caisse": [14.8, -4.5, 17, -2.4],
  cuisine: [6, 5.8, 17, 10],
  "cabine du sud-ouest": [-11.75, 4.7, -10.65, 5.7],
  "cabines de l'aile": [-27.75, 2.45, -26.65, 5.15],
  poufs: [-22.8, 3, -20.8, 5],
};

// Deux rectangles qui se touchent à peine (arrondis de calcul) ne se croisent pas.
const croise = (a, b) =>
  a[0] < b[2] - 0.01 &&
  b[0] < a[2] - 0.01 &&
  a[1] < b[3] - 0.01 &&
  b[1] < a[3] - 0.01;

const rectDeco = ([type, ...v]) => {
  if (type === "plante")
    return [v[0] - 0.35, v[1] - 0.35, v[0] + 0.35, v[1] + 0.35];
  if (type === "cloison")
    return [
      Math.min(v[0], v[2]) - 0.15,
      Math.min(v[1], v[3]) - 0.15,
      Math.max(v[0], v[2]) + 0.15,
      Math.max(v[1], v[3]) + 0.15,
    ];
  const [x, z, a, l] = v;
  const [lx, lz] = Math.abs(Math.cos(a)) > 0.5 ? [l, 0.42] : [0.42, l];
  return [x - lx / 2, z - lz / 2, x + lx / 2, z + lz / 2];
};

// Tout ce qui occupe le sol : bureaux, renforts, décor des pôles.
const objets = ({ poles }) => [
  ...Object.entries(poles).flatMap(([id, p]) => [
    ...p.postes.map((b, k) => [`${id} poste ${k}`, emprise(b)]),
    ...p.deco.map((d) => [`${id} ${d[0]}`, rectDeco(d)]),
  ]),
  ...RENFORTS.map((b, k) => [`renfort ${k}`, emprise(b)]),
];

describe("disposer", () => {
  it("prévoit deux postes par membre, au moins deux", () => {
    const { poles } = disposer(ACTUEL);
    expect(poles.produit.postes).toHaveLength(14);
    expect(poles.argent.postes).toHaveLength(4);
    expect(disposer({}).poles.argent.postes).toHaveLength(2);
  });

  it("loge l'équipe actuelle sans extension", () => {
    expect(disposer(ACTUEL).ouest).toBe(OUEST);
  });

  it("ne superpose rien, ni sur les espaces communs, et reste dans le bâtiment", () => {
    for (const eff of [{}, ACTUEL, PLEIN, { ...ACTUEL, tech: 9 }]) {
      const d = disposer(eff);
      const liste = objets(d);
      for (let i = 0; i < liste.length; i++) {
        const [nom, r] = liste[i];
        expect(r[0] > d.ouest && r[2] <= 17, nom).toBe(true);
        expect(r[1] > -4.5 && r[3] < 5.8, nom).toBe(true);
        for (const [lieu, c] of Object.entries(COMMUNS))
          expect(croise(r, c), `${nom} sur ${lieu}`).toBe(false);
        for (let j = i + 1; j < liste.length; j++)
          expect(croise(r, liste[j][1]), `${nom} / ${liste[j][0]}`).toBe(false);
      }
    }
  });

  it("donne le même plan pour les mêmes effectifs", () => {
    expect(JSON.stringify(disposer(ACTUEL))).toBe(
      JSON.stringify(disposer({ ...ACTUEL })),
    );
  });

  it("ne déplace aucun poste existant quand un agent arrive", () => {
    for (const eff of [ACTUEL, { ...ACTUEL, tech: 6, marketing: 5 }, PLEIN])
      for (const id of Object.keys(eff)) {
        const avant = disposer(eff).poles;
        const apres = disposer({ ...eff, [id]: eff[id] + 1 }).poles;
        for (const [p, v] of Object.entries(avant)) {
          expect(apres[p].postes.slice(0, v.postes.length)).toEqual(v.postes);
        }
        expect(apres[id].postes).toHaveLength(avant[id].postes.length + 2);
      }
  });

  it("ouvre l'allée du pôle dans l'extension ouest quand son espace est plein", () => {
    const d = disposer({ ...ACTUEL, produit: 9 });
    expect(d.ouest).toBeLessThan(OUEST);
    expect(d.poles.produit.postes.filter((b) => b.x < OUEST)).toHaveLength(4);
    expect(d.poles.produit.ilots.at(-1)[2]).toBeLessThan(OUEST);
  });
});

describe("repartir", () => {
  it("range les agents par pôle, le board à part, les chefs exclus", () => {
    const m = repartir([
      { id: "da", equipe: "Produit", nom: "Nina" },
      { id: "motion", equipe: "Produit & design" },
      { id: "dev", equipe: "Technique" },
      { id: "chef-projet", equipe: "Opérations" },
      { id: "chef-tech", equipe: "board" },
      { id: "avocat", equipe: "board" },
      { id: "nouveau", equipe: "renforts" },
      { id: "bizarre", equipe: 42 },
      null,
      { equipe: "Technique" },
    ]);
    expect(m.equipes.produit).toEqual(["da", "motion"]);
    expect(m.equipes.tech).toEqual(["dev"]);
    expect(m.equipes.operations).toEqual(["chef-projet"]);
    expect(m.board).toEqual(["avocat"]);
    expect(m.autres).toEqual(["nouveau", "bizarre"]);
    expect(m.fiches.get("da").nom).toBe("Nina");
    expect(m.fiches.has("chef-tech")).toBe(false);
  });
});

describe("repli", () => {
  it("traduit l'organigramme au format de /agents", () => {
    const org = {
      chefs: [
        { id: "ceo", equipe: [] },
        { id: "tech", equipe: ["dev", "reviewer"] },
      ],
      board: ["chef-*", "avocat"],
    };
    expect(repartir(repli(org))).toMatchObject({
      equipes: { tech: ["dev", "reviewer"] },
      board: ["avocat"],
    });
  });
});
