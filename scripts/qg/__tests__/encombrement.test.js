// Encombrement du mobilier du plan : portes dégagées, chaises loin des murs et des plantes.
import { describe, expect, it } from "vitest";
import { E2, NIVEAUX, NOYAU, TRAME, lieux } from "../public/tour/plan.js";
import { CENTRE } from "../public/tour3d/repere.js";
import {
  bureaux,
  massifs,
  sieges,
  solDe,
} from "../public/tour3d/interieur-plan.js";
import { rotation } from "../public/tour3d/sens.js";

const CHAISE = 0.57;
// Rien au sol : la plateforme de l'héliport passe au-dessus des portes du noyau.
const SANS_EMPRISE = new Set([
  "plateforme",
  "helisurface",
  "p-marbre",
  "p-tapis",
  "tapis",
  "p-lustre-anneaux",
  "p-lustre-disques",
  "p-mezzanine",
]);

// Boîte [x1, y1, x2, y2] d'un meuble, chaises comprises ; null s'il ne pose rien au sol.
function emprise(m) {
  const { type, x, y, w, h, r } = m;
  if ("x1" in m || m.d || m.zone || SANS_EMPRISE.has(type)) return null;
  const disque = (rr) => [x - rr, y - rr, x + rr, y + rr];
  if (type === "table")
    return [x - CHAISE, y - CHAISE, x + w + CHAISE, y + h + CHAISE];
  if (type === "ronde") return disque(r + (m.n ? CHAISE : 0));
  if (type === "chaise") return disque(0.22);
  if (type === "ilot") return [x, y - 0.6, x + m.n * 1.6, y + 2.1];
  if (type === "poste") return [x, y - 0.7, x + w, y + h + 0.7];
  if (w === undefined) return disque(r ?? 0.3);
  return [x, y, x + w, y + h];
}

const debattement = ({ x, y, l, axe }) =>
  axe === "h" ? [x, y - 1, x + l, y + 1] : [x - 1, y, x + 1, y + l];
const croise = (a, b) =>
  a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

// Portes qui se franchissent (les grandes ouvertures sans mur exclues), noyau compris.
function portes(n) {
  const sert = (a) => a.dessert.includes(n.id);
  const noyau = NOYAU.niveaux.includes(n.id)
    ? [
        ...NOYAU.ascenseurs.filter(sert).map((a) => ({ ...a.porte, id: a.id })),
        ...NOYAU.escaliers.filter(sert).map((e) => ({ ...e.porte, id: e.id })),
        ...NOYAU.sanitaires.portes.map((p) => ({ ...p, id: "WC" })),
      ]
    : [];
  return [...n.portes.filter((p) => p.type !== "ouvert"), ...noyau];
}

const plan = ({ x, z }) => [x + CENTRE.x, z + CENTRE.y];
const ASSIS = new Set(["table", "ronde", "chaise", "comptoir"]);

// Chaises et postes de chaque pièce, en coordonnées du plan.
const chaises = (n) =>
  lieux(n).flatMap((p) =>
    p.mobilier.flatMap((m) => [
      ...(ASSIS.has(m.type) ? sieges(m, p) : [])
        .filter((s) => !s.debout)
        .map((s) => ({ p, m, pt: plan(s) })),
      ...bureaux(m, p).map((b) => ({ p, m, pt: plan(b.place) })),
    ]),
  );

// Arbres du plan et massifs posés par la 3D sur les sols en gazon : disques { x, y, r }.
const plantes = (n) =>
  lieux(n).flatMap((p) => [
    ...p.mobilier.filter((m) => m.type === "arbre"),
    ...(solDe(p) === "gazon"
      ? massifs(p.poly).map(({ x, y, t }) => ({ x, y, r: 0.5 * t }))
      : []),
  ]);

const bords = ([x1, y1, x2, y2]) => [
  [x1, y1, x2, y1],
  [x2, y1, x2, y2],
  [x1, y2, x2, y2],
  [x1, y1, x1, y2],
];

// Murs du plan, façades de l'emprise, noyau et E2.
function murs(n) {
  const out = n.murs
    .filter((m) => m.type !== "trou" && m.type !== "pointille")
    .map((m) => [m.x1, m.y1, m.x2, m.y2]);
  if (n.facade !== false)
    out.push(...bords([n.x0, 0, TRAME.largeur, TRAME.profondeur]));
  if (NOYAU.niveaux.includes(n.id)) out.push(...bords(NOYAU.rect));
  if (E2.dessert.includes(n.id))
    out.push(...bords(E2.edicules[n.id] ?? E2.rect));
  return out;
}

function distance([px, py], [x1, y1, x2, y2]) {
  const [dx, dy] = [x2 - x1, y2 - y1];
  const l2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}

describe("encombrement du mobilier", () => {
  it("aucun meuble dans le débattement d'une porte (1 m devant, des deux côtés)", () => {
    for (const n of NIVEAUX)
      for (const d of portes(n)) {
        const zone = debattement(d);
        for (const p of lieux(n))
          for (const m of p.mobilier) {
            const e = emprise(m);
            if (e)
              expect(
                croise(e, zone),
                `${n.id} porte ${d.entre ?? d.id} : ${p.id} ${m.type} (${m.x}, ${m.y})`,
              ).toBe(false);
          }
      }
  });

  it("aucune chaise à moins de 0,3 m d'un arbre, d'un massif ou d'un mur (0,8 m dans un café)", () => {
    for (const n of NIVEAUX) {
      const vegetal = plantes(n);
      const parois = murs(n);
      for (const { p, m, pt } of chaises(n)) {
        const min = /café/i.test(p.usage) ? 0.8 : 0.3;
        const ou = `${n.id} ${p.id} ${m.type} (${m.x}, ${m.y})`;
        for (const a of vegetal)
          expect(
            Math.hypot(pt[0] - a.x, pt[1] - a.y) - a.r,
            ou,
          ).toBeGreaterThanOrEqual(min);
        for (const s of parois)
          expect(distance(pt, s), ou).toBeGreaterThanOrEqual(min);
      }
    }
  });

  it("les cabines téléphoniques de Call Me laissent la porte libre", () => {
    const n3 = NIVEAUX.find((n) => n.id === "n3");
    const porte = n3.portes.find((d) => d.entre.includes("call-me"));
    const cabines = lieux(n3)
      .find((p) => p.id === "call-me")
      .mobilier.filter((m) => m.type === "cabine");
    expect(cabines).toHaveLength(4);
    for (const c of cabines)
      expect(Math.abs(c.y + c.h / 2 - porte.y)).toBeGreaterThan(2);
  });

  it("tourne les projecteurs du studio vidéo vers l'écran du plateau", () => {
    const studio = lieux(NIVEAUX.find((n) => n.id === "n4")).find(
      (p) => p.id === "electric-lady",
    );
    const ecran = studio.mobilier.find((m) => m.type === "ecran");
    const projecteurs = studio.mobilier.filter((m) => m.type === "projecteur");
    expect(projecteurs).toHaveLength(2);
    for (const m of projecteurs) {
      const t = rotation(m, studio);
      // Face lumineuse en -z local : (-sin t, -cos t) dans le plan.
      const [vx, vy] = [-Math.sin(t), -Math.cos(t)];
      const [dx, dy] = [
        (ecran.x1 + ecran.x2) / 2 - m.x,
        (ecran.y1 + ecran.y2) / 2 - m.y,
      ];
      expect((vx * dx + vy * dy) / Math.hypot(dx, dy)).toBeCloseTo(1, 5);
    }
  });
});
