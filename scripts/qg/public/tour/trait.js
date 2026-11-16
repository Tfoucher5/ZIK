// Primitives de dessin SVG des plans : 1 m = 10 unités, styles de trait de plans.css.
import { EQUIPE } from "../noms.js";

const f = (n) => +(n * 10).toFixed(1);

export const nomAgent = (id) =>
  id === "libre"
    ? "libre"
    : id.startsWith("renfort:")
      ? id.slice(8)
      : (EQUIPE[id]?.nom ?? id);

export function trait() {
  const o = [];
  const lab = [];
  const P = (s) => o.push(s);
  const L = (a, b, c, d, cl) =>
    P(
      `<line x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(d)}" class="${cl}"/>`,
    );
  const R = (x, y, w, h, cl, rx = 0, plus = "") =>
    P(
      `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" class="${cl}"${plus}/>`,
    );
  const Ci = (x, y, r, cl) =>
    P(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="${cl}"/>`);
  const texte = (x, y, t, cl, plus = "") =>
    lab.push(`<text x="${f(x)}" y="${f(y)}" class="${cl}"${plus}>${t}</text>`);
  const trou = (a, b, c, d) => L(a, b, c, d, "trou");
  function vit(a, b, c, d, cl = "vit") {
    const e = 0.1;
    if (b === d) (L(a, b - e, c, d - e, cl), L(a, b + e, c, d + e, cl));
    else (L(a - e, b, c - e, d, cl), L(a + e, b, c + e, d, cl));
  }
  // Porte : charnière en (x, y), passage de largeur w le long de ax, battant du côté sw.
  function pt(x, y, w, ax, sw, flip) {
    const h = ax === "h";
    const x2 = h ? x + w : x;
    const y2 = h ? y : y + w;
    trou(x, y, x2, y2);
    const [hx, hy, ox, oy] = flip ? [x2, y2, x, y] : [x, y, x2, y2];
    const lx = h ? hx : hx + sw * w;
    const ly = h ? hy + sw * w : hy;
    const cr = (lx - hx) * (oy - hy) - (ly - hy) * (ox - hx);
    L(hx, hy, lx, ly, "fin");
    P(
      `<path d="M${f(lx)} ${f(ly)}A${f(w)} ${f(w)} 0 0 ${cr > 0 ? 1 : 0} ${f(ox)} ${f(oy)}" class="fin" stroke-dasharray="1.2 1"/>`,
    );
  }
  function pt2(x, y, w, ax, sw) {
    pt(x, y, w / 2, ax, sw, false);
    if (ax === "h") pt(x + w / 2, y, w / 2, ax, sw, true);
    else pt(x, y + w / 2, w / 2, ax, sw, true);
  }
  const ch = (x, y) => Ci(x, y, 0.22, "mob");
  function tab(x, y, w, h) {
    R(x, y, w, h, "mob", 0.15);
    const hz = w >= h;
    const l = hz ? w : h;
    const n = Math.max(1, Math.floor(l / 0.75));
    for (let i = 0; i < n; i++) {
      const c = ((i + 0.5) * l) / n;
      if (hz) (ch(x + c, y - 0.35), ch(x + c, y + h + 0.35));
      else (ch(x - 0.35, y + c), ch(x + w + 0.35, y + c));
    }
    if ((hz ? h : w) >= 1) {
      if (hz) (ch(x - 0.35, y + h / 2), ch(x + w + 0.35, y + h / 2));
      else (ch(x + w / 2, y - 0.35), ch(x + w / 2, y + h + 0.35));
    }
  }
  function rond(x, y, r, n) {
    Ci(x, y, r, "mob");
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + 0.5;
      ch(x + Math.cos(a) * (r + 0.35), y + Math.sin(a) * (r + 0.35));
    }
  }
  function esc(x, y, w, h) {
    R(x, y, w, h, "fin");
    const v = h >= w;
    const l = v ? h : w;
    for (let d = 0.3; d < l - 0.05; d += 0.3)
      v ? L(x, y + d, x + w, y + d, "mob") : L(x + d, y, x + d, y + h, "mob");
    if (v) L(x + w / 2, y + h - 0.3, x + w / 2, y + 0.3, "fin");
    else L(x + 0.3, y + h / 2, x + w - 0.3, y + h / 2, "fin");
  }
  const pre = (x, y, id) => id && texte(x, y, nomAgent(id), "pre");
  const croix = (x, y, w, h, cl) => (
    L(x, y, x + w, y + h, cl),
    L(x, y + h, x + w, y, cl)
  );

  // Un meuble du plan, d'après son type (outils.js).
  function meuble(m) {
    const { type, x, y, w, h, r } = m;
    if ("x1" in m)
      return L(m.x1, m.y1, m.x2, m.y2, type === "ecran" ? "ecr" : "mob");
    if (type === "table") return tab(x, y, w, h);
    if (type === "ronde") return rond(x, y, r, m.n);
    if (type === "chaise") return ch(x, y);
    if (type === "escalier") return esc(x, y, w, h);
    if (type === "arbre")
      return (
        Ci(x, y, r, "arb"),
        Ci(x + r * 0.1, y - r * 0.08, r * 0.58, "arb2"),
        Ci(x, y, 0.12, "pot")
      );
    if (type === "canape") {
      R(x, y, w, h, "mob", 0.2);
      return w >= h
        ? L(x + 0.15, y + h * 0.3, x + w - 0.15, y + h * 0.3, "mob")
        : L(x + w * 0.3, y + 0.15, x + w * 0.3, y + h - 0.15, "mob");
    }
    if (type === "ilot") {
      const { n, occupants: oc } = m;
      for (let i = 0; i < n; i++) {
        const cx = x + i * 1.6 + 0.8;
        R(x + i * 1.6, y, 1.6, 0.75, "mob");
        R(x + i * 1.6, y + 0.75, 1.6, 0.75, "mob");
        ch(cx, y - 0.38);
        ch(cx, y + 1.88);
        pre(cx, y - 0.82, oc[i]);
        pre(cx, y + 2.62, oc[n + i]);
      }
      return;
    }
    if (type === "poste") {
      const sud = m.a === 180;
      R(x, y, w, h, "mob", 0.1);
      ch(x + w / 2, sud ? y + h + 0.42 : y - 0.42);
      ch(x + w * 0.3, sud ? y - 0.5 : y + h + 0.5);
      ch(x + w * 0.7, sud ? y - 0.5 : y + h + 0.5);
      return pre(x + w / 2, sud ? y + h + 1.07 : y - 0.9, m.occupant);
    }
    if (type === "banque")
      return (
        R(x, y, w, h, "mob", r),
        ch(x + w / 2, y - 0.5),
        pre(x + w / 2, y - 0.95, m.occupant)
      );
    if (m.n !== undefined && w) {
      R(x, y, w, h, "mob", 0.1);
      for (let i = 0; i < m.n; i++) ch(x + ((i + 0.5) * w) / m.n, y + h + 0.4);
      return pre(x + w / 2, y - 0.3, m.occupant);
    }
    if (m.d) {
      const d = m.d.map(([c, ...v]) => c + v.map(f).join(" ")).join("");
      return P(
        `<path d="${d}" class="${type === "ruisseau" ? "tir" : "mob"}"/>`,
      );
    }
    if (type === "disque-or") return Ci(x, y, r, "orf");
    if (type === "helisurface") {
      Ci(x, y, r, "por");
      Ci(x, y, r - 1.1, "fin");
      return P(
        `<path d="M${f(x - 1.4)} ${f(y - 2)}v${f(4)}M${f(x + 1.4)} ${f(y - 2)}v${f(4)}M${f(x - 1.4)} ${f(y)}h${f(2.8)}" class="por" style="stroke-width:5"/>`,
      );
    }
    if (r !== undefined && !w) return Ci(x, y, r, "mob");
    if (m.zone) return R(x, y, w, h, "tir");
    if (type === "plateforme")
      return (
        R(x, y, w, h, "fin", 0, ' fill="var(--plan)"'),
        R(x, y, w, h, "tir")
      );
    R(x, y, w, h, "mob", r ?? 0);
    if (type === "equipement") croix(x, y, w, h, "mob");
    if (type === "ping-pong") L(x + w / 2, y, x + w / 2, y + h, "mob");
  }

  function nom(x, y, n, sous = [], cl = "") {
    if (n) texte(x, y, n, `nom ${cl}`);
    sous.forEach((t, i) => texte(x, y + 0.62 + i * 0.5, t, "us"));
  }

  return {
    o,
    lab,
    P,
    L,
    R,
    Ci,
    texte,
    trou,
    vit,
    pt,
    pt2,
    esc,
    ch,
    croix,
    meuble,
    nom,
    f,
  };
}
