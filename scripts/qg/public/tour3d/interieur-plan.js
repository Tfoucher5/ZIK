// Lecture du plan pour les intérieurs 3D, sans three : sols, murs percés des portes, postes, sièges.
import { TRAME, lieux } from "../tour/plan.js";
import { versLocal } from "./repere.js";

const SOLS = [
  ["gazon", /arbres|jardin|atrium/],
  ["terrasse", /terrasse|loggia/],
  ["sportif", /sport|yoga|étirements|\bring\b/],
  [
    "carrelage",
    /cuisine|plonge|froides|vestiaires|douches|sauna|infirmerie|self|kiné|lingerie|tri |déchets|office/,
  ],
  [
    "beton",
    /couloir|coursive|palier|hall|foyer|passage|quai|local|archives|pompes|tgbt|sécurité|cta|héliport|serveurs|reprographie|entrée|cabines/,
  ],
  [
    "parquet",
    /café|bar|salon|restaurant|bibliothèque|sieste|loge|galerie|antichambre|auditorium|salle à manger|bureau|karaoké|jeux|démo|massage/,
  ],
];

export function solDe(piece) {
  const t = `${piece.usage ?? ""} ${piece.nom}`.toLowerCase();
  if (piece.exterieur && !/arbres|plantée/.test(t)) return "terrasse";
  return SOLS.find(([, re]) => re.test(t))?.[0] ?? "moquette";
}

export const ecranZik = (piece) =>
  /soirée|démo|écran|karaoké|monitoring|test|blind/i.test(
    `${piece.usage} ${(piece.sous ?? []).join(" ")}`,
  );

export const centrePoly = (poly) => [
  poly.reduce((s, p) => s + p[0], 0) / poly.length,
  poly.reduce((s, p) => s + p[1], 0) / poly.length,
];

export const airePoly = (poly) =>
  Math.abs(
    poly.reduce((s, [x, y], i) => {
      const [u, v] = poly[(i + 1) % poly.length];
      return s + x * v - u * y;
    }, 0),
  ) / 2;

const passage = (p) =>
  p.axe === "h" ? [p.x, p.y, p.x + p.l, p.y] : [p.x, p.y, p.x, p.y + p.l];

export function enFacade(m, x0 = 0) {
  const { largeur: W, profondeur: H } = TRAME;
  if (m.y1 === m.y2) return m.y1 <= 0.01 || m.y1 >= H - 0.01;
  if (m.x1 === m.x2) return m.x1 <= x0 + 0.01 || m.x1 >= W - 0.01;
  return false;
}

// Tronçons pleins d'un mur une fois retirés les passages des portes posées dessus.
export function troncons(m, portes) {
  const long = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
  if (long < 0.01) return [];
  const [dx, dy] = [(m.x2 - m.x1) / long, (m.y2 - m.y1) / long];
  const le = (x, y) => (x - m.x1) * dx + (y - m.y1) * dy;
  const ecart = (x, y) => Math.abs((x - m.x1) * dy - (y - m.y1) * dx);
  const trous = portes
    .map(passage)
    .filter(([a, b, c, d]) => ecart(a, b) < 0.2 && ecart(c, d) < 0.2)
    .map(([a, b, c, d]) => [le(a, b), le(c, d)].sort((u, v) => u - v))
    .filter(([a, b]) => b > 0.01 && a < long - 0.01)
    .sort((u, v) => u[0] - v[0]);
  const out = [];
  let de = 0;
  for (const [a, b] of trous) {
    if (a > de + 0.05) out.push([de, a]);
    de = Math.max(de, b);
  }
  if (long > de + 0.05) out.push([de, long]);
  return out.map(([a, b]) => [
    m.x1 + dx * a,
    m.y1 + dy * a,
    m.x1 + dx * b,
    m.y1 + dy * b,
  ]);
}

const local = (x, y) => versLocal(x, y);
const vers = (dx, dz) => Math.atan2(dx, dz);

// Bureau occupable : centre local, rotation (le +z local regarde l'occupant), place et regard de l'occupant.
function bureau(occupant, x, y, l, p, nord, sorte) {
  const c = local(x + l / 2, y + p / 2);
  const s = nord ? -1 : 1;
  return {
    occupant,
    sorte,
    x: c.x,
    z: c.z,
    l,
    p,
    rot: nord ? Math.PI : 0,
    place: { x: c.x, z: c.z + s * (p / 2 + 0.45) },
    angle: nord ? 0 : Math.PI,
  };
}

export function bureaux(m) {
  if (m.type === "ilot")
    return Array.from({ length: m.n * 2 }, (_, k) => {
      const i = k % m.n;
      const nord = k < m.n;
      return bureau(
        m.occupants[k] ?? null,
        m.x + i * 1.6,
        m.y + (nord ? 0 : 0.75),
        1.6,
        0.75,
        nord,
        "poste",
      );
    });
  if (m.type === "poste")
    return [bureau(m.occupant, m.x, m.y, m.w, m.h, m.a !== 180, "poste")];
  if (m.type === "banque" || (m.type === "comptoir" && m.occupant))
    return [bureau(m.occupant, m.x, m.y, m.w, m.h, true, m.type)];
  return [];
}

export const estAgent = (id) =>
  !!id && id !== "libre" && !id.startsWith("renfort:");

const siege = (x, y, cx, cy, debout = false) => {
  const p = local(x, y);
  return { x: p.x, z: p.z, angle: vers(cx - x, cy - y), debout };
};

// Sièges et places d'usage d'un meuble, en coordonnées locales, tournés vers ce qu'on regarde.
export function sieges(m) {
  const { type, x, y, w, h, r } = m;
  const cx = x + (w ?? 0) / 2;
  const cy = y + (h ?? 0) / 2;
  const le = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  if (type === "table") {
    const hz = w >= h;
    const l = hz ? w : h;
    const n = Math.max(1, Math.floor(l / 0.75));
    const out = le(n, (i) => (i + 0.5) * (l / n)).flatMap((c) =>
      hz
        ? [
            siege(x + c, y - 0.35, x + c, cy),
            siege(x + c, y + h + 0.35, x + c, cy),
          ]
        : [
            siege(x - 0.35, y + c, cx, y + c),
            siege(x + w + 0.35, y + c, cx, y + c),
          ],
    );
    return out;
  }
  if (type === "ronde") {
    if (!m.n)
      return [
        siege(x - r - 0.4, y, x, y, true),
        siege(x + r + 0.4, y, x, y, true),
      ];
    return le(m.n, (i) => {
      const a = (i / m.n) * Math.PI * 2 + 0.5;
      return siege(
        x + Math.cos(a) * (r + 0.35),
        y + Math.sin(a) * (r + 0.35),
        x,
        y,
      );
    });
  }
  if (type === "canape" || (type === "banc" && w)) {
    const hz = w >= h;
    const n = Math.max(1, Math.floor((hz ? w : h) / 0.8));
    return le(n, (i) => {
      const c = (i + 0.5) * ((hz ? w : h) / n);
      return hz
        ? siege(x + c, y + h * 0.6, x + c, y + h + 1)
        : siege(x + w * 0.6, y + c, x + w + 1, y + c);
    });
  }
  if (type === "chaise") return [siege(x, y, x, y + 1)];
  if (type === "comptoir" || type === "bar") {
    const hz = w >= h;
    const n = m.n ?? Math.max(1, Math.floor((hz ? w : h) / 0.8));
    return le(n, (i) => {
      const c = (i + 0.5) * ((hz ? w : h) / n);
      return hz
        ? siege(x + c, y + h + 0.4, x + c, y, !m.n)
        : siege(x + w + 0.4, y + c, x, y + c, !m.n);
    });
  }
  if (["tapis-de-course", "tapis", "borne"].includes(type))
    return [siege(cx, cy, cx, y - 1, true)];
  if (
    ["rameur", "banc-de-musculation", "nacelle", "table-de-massage"].includes(
      type,
    )
  )
    return [siege(cx, cy, cx, y - 1)];
  if (["baby-foot", "billard", "ping-pong"].includes(type))
    return w >= h
      ? [siege(x - 0.4, cy, cx, cy, true), siege(x + w + 0.4, cy, cx, cy, true)]
      : [
          siege(cx, y - 0.4, cx, cy, true),
          siege(cx, y + h + 0.4, cx, cy, true),
        ];
  if (type === "rang-de-sieges") {
    const n = Math.max(1, Math.floor(Math.max(w, h) / 0.55));
    return le(n, (i) =>
      w >= h
        ? siege(x + (i + 0.5) * (w / n), cy, x + (i + 0.5) * (w / n), cy - 1)
        : siege(cx, y + (i + 0.5) * (h / n), cx - 1, y + (i + 0.5) * (h / n)),
    );
  }
  return [];
}

// Données d'intérieur d'un niveau, sans three : ce que interieur.js construit et renvoie.
export function lireNiveau(niveau) {
  const pieces = lieux(niveau);
  const postes = {};
  const pauses = [];
  const salles = {};
  for (const p of pieces) {
    const [cx, cy] = centrePoly(p.poly);
    const assis = p.mobilier.flatMap(sieges);
    salles[p.id] = { centre: local(cx, cy), sieges: assis };
    if (!p.reunion && !p.occupants.length)
      pauses.push(...assis.map((s) => ({ ...s, piece: p.id })));
    for (const b of p.mobilier.flatMap(bureaux))
      if (estAgent(b.occupant)) postes[b.occupant] = { ...b, piece: p.id };
  }
  return { postes, pauses, salles };
}
