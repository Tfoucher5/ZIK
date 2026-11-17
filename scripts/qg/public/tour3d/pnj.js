// Les PNJ de la ZIK TOWER : employés anonymes, présents selon l'heure et le jour, sans dépendance à three.js.
import { NIVEAUX, lieux } from "../tour/plan.js";
import { bureaux, estAgent } from "./interieur-plan.js";

const graine = (s) => {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

const S = ["public", "employes", "service"];
const E = ["public", "employes"];
const COULOIRS = [
  "penny-lane",
  "route-66",
  "highway-61",
  "broadway",
  "carnaby-street",
  "denmark-street",
  "rue-de-lappe",
  "mezzanine",
];

// Chaque rôle : effectif en semaine et le week-end, plages horaires, pièces, droits, debout ou assis.
// Une plage [a, b] peut passer minuit (a > b). Chacun décale son arrivée et son départ d'un quart d'heure à 45 min.
export const ROLES = {
  employe: { n: 37, we: 6, plages: [[8.5, 18]], bureau: true, droits: E },
  noctambule: { n: 2, we: 2, plages: [[20, 3]], bureau: true, droits: E },
  cuisinier: {
    n: 4,
    we: 2,
    plages: [[9, 14.5]],
    pieces: ["soul-kitchen"],
    droits: S,
    debout: true,
  },
  serveur: {
    n: 3,
    we: 2,
    plages: [[11.5, 14.5]],
    pieces: ["motown", "stax", "sun-records"],
    droits: S,
    debout: true,
  },
  barista: {
    n: 2,
    we: 2,
    plages: [[7, 20]],
    pieces: ["cavern-club"],
    droits: E,
    debout: true,
  },
  coach: {
    n: 1,
    we: 1,
    plages: [[7, 21]],
    pieces: ["madison-square-garden"],
    droits: E,
    debout: true,
  },
  sportif: {
    n: 6,
    we: 4,
    plages: [
      [7, 9],
      [12, 14],
      [17, 21],
    ],
    pieces: ["madison-square-garden"],
    droits: E,
  },
  joueur: {
    n: 4,
    we: 6,
    plages: [
      [12, 14],
      [17, 22.5],
    ],
    pieces: ["studio-54"],
    droits: E,
  },
  invite: {
    n: 14,
    we: 0,
    plages: [
      [10.5, 12],
      [15.5, 17],
    ],
    pieces: ["olympia"],
    droits: E,
  },
  reception: {
    n: 1,
    we: 1,
    plages: [[7.5, 19.5]],
    pieces: ["carnegie-hall"],
    droits: E,
    debout: true,
  },
  vigile: {
    n: 1,
    we: 1,
    plages: [[7, 19.5]],
    pieces: ["the-police"],
    droits: S,
    bureau: true,
  },
  veilleur: {
    n: 1,
    we: 1,
    plages: [[19.5, 7]],
    pieces: ["carnegie-hall"],
    droits: S,
    debout: true,
  },
  assistante: {
    n: 1,
    we: 0,
    plages: [[8.5, 18.5]],
    pieces: ["salle-pleyel"],
    droits: [...E, "direction"],
    bureau: true,
  },
  entretien: {
    n: 2,
    we: 2,
    plages: [[6, 19.5]],
    pieces: COULOIRS,
    droits: S,
    debout: true,
    ronde: true,
  },
  menage: {
    n: 3,
    we: 2,
    plages: [[19.5, 6]],
    pieces: COULOIRS,
    droits: S,
    debout: true,
    ronde: true,
  },
  livreur: {
    n: 2,
    we: 0,
    plages: [[6, 10]],
    pieces: ["return-to-sender"],
    droits: S,
    debout: true,
  },
};

const dans = (h, [a, b]) => (a <= b ? h >= a && h < b : h >= a || h < b);

// Présent à l'heure h ? Arrivée et départ décalés, stables pour une même personne.
export function present(role, k, h) {
  const d = (graine(`${role}#${k}`) % 4) * 0.25;
  return ROLES[role].plages.some(([a, b]) => dans(h, [a + d, b + d]));
}

const weekEnd = (jour) => jour === 0 || jour === 6;

// Les PNJ présents à l'heure h du jour (0 dimanche … 6 samedi) : [{ id, role, k }].
export function presents(h, jour) {
  const out = [];
  for (const [role, r] of Object.entries(ROLES)) {
    const n = weekEnd(jour) ? r.we : r.n;
    for (let k = 0; k < n; k++)
      if (present(role, k, h)) out.push({ id: `${role}#${k}`, role, k });
  }
  return out;
}

const niveauDe = (piece) =>
  NIVEAUX.find((n) => lieux(n).some((p) => p.id === piece));

// Bureaux sans agent ouverts aux employés et aux pôles, pièce après pièce pour remplir chaque plateau.
const LIBRES = (() => {
  const parPiece = [];
  for (const n of NIVEAUX)
    for (const p of lieux(n)) {
      if (p.acces !== "employes" && !p.acces.startsWith("pole:")) continue;
      const libres = p.mobilier
        .flatMap(bureaux)
        .filter((b) => b.sorte === "poste" && !estAgent(b.occupant))
        .map((b) => ({ niveau: n.id, piece: p.id, acces: p.acces, bureau: b }));
      if (libres.length) parPiece.push(libres);
    }
  const out = [];
  for (let i = 0; parPiece.some((l) => l[i]); i++)
    for (const l of parPiece) if (l[i]) out.push(l[i]);
  return out;
})();
export const bureauxLibres = () => LIBRES;
// Les noctambules prennent les bureaux par la fin, loin des employés de jour.
const libre = (role, k) =>
  LIBRES[(role === "noctambule" ? LIBRES.length - 1 - k : k) % LIBRES.length];

// Bureau d'une pièce du plan, même occupé par personne.
function bureauDans(piece, k) {
  const n = niveauDe(piece);
  const p = lieux(n).find((x) => x.id === piece);
  const b = p.mobilier.flatMap(bureaux).filter((x) => !estAgent(x.occupant));
  return b.length
    ? { niveau: n.id, piece, acces: p.acces, bureau: b[k % b.length] }
    : null;
}

// Où est le PNJ à l'heure h : { niveau, piece, acces, bureau? }. Les employés déjeunent au restaurant,
// l'entretien change de couloir toutes les dix minutes.
export function lieuPnj(role, k, h) {
  const r = ROLES[role];
  const g = graine(`${role}#${k}`);
  if (role === "employe") {
    const midi = 12 + (g % 4) * 0.25;
    if (h >= midi && h < midi + 1 && g % 3 !== 0)
      return place(g % 2 ? "stax" : "motown");
  }
  if (!r.pieces) return libre(role, k);
  if (r.bureau) return bureauDans(r.pieces[0], k);
  const i = r.ronde ? graine(`${role}#${k}:${Math.floor(h * 6)}`) : k;
  return place(r.pieces[i % r.pieces.length]);
}

function place(piece) {
  const n = niveauDe(piece);
  return {
    niveau: n.id,
    piece,
    acces: lieux(n).find((p) => p.id === piece).acces,
  };
}

// Droits d'un PNJ : ceux de son rôle, plus le pôle du plateau où il travaille. Jamais fondateur.
export function droitsPnj(role, k) {
  const d = new Set(ROLES[role].droits);
  const b = !ROLES[role].pieces && libre(role, k);
  if (b && b.acces.startsWith("pole:")) d.add(b.acces);
  return d;
}
