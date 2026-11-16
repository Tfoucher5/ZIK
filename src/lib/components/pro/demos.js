// Démos animées de /pro : chaque démo est un état calculé depuis le temps
// écoulé t (secondes) dans sa boucle. Rien d'aléatoire, testable sans DOM.
import { visibleLoop } from "../ui/loop.js";

export const pad = (n) => String(n).padStart(2, "0");

// Index du dernier repère atteint (-1 avant le premier)
const phase = (t, marks) => marks.findLastIndex((m) => t >= m);

// Lignes du classement TV, dans l'ordre d'origine (clés stables) avec leur rang
function ranking(base, events, k, flash) {
  const rows = base.map(([n, s]) => {
    const got = events.filter(([at, who]) => who === n && k >= at);
    const last = got.at(-1);
    const fresh = last && k - last[0] < flash;
    return {
      n,
      s: s + got.reduce((sum, e) => sum + e[2], 0),
      plus: fresh ? `+${last[2]}` : "",
    };
  });
  const order = [...rows].sort((a, b) => b.s - a.s);
  return rows.map((r) => ({ ...r, y: order.indexOf(r) }));
}

const HERO_BASE = [
  ["Léa", 21],
  ["Karim", 19],
  ["Zoé", 17],
  ["Hugo", 14],
  ["Inès", 12],
  ["Sarah", 9],
];
// [pas, joueur, points] ; un pas = une seconde du chrono affiché
const HERO_EVENTS = [
  [3, "Karim", 3],
  [12, "Léa", 5],
  [15, "Zoé", 2],
];
const STEP = 0.52;
const HERO_LAST = 18;
const ARTIST = "daft punk";
const TITLE = "one more time";
export const HERO_CYCLE = (HERO_LAST + 1) * STEP + 1.6;
export const HERO_STILL = HERO_LAST * STEP;

const typing = (text, k) =>
  text.slice(0, Math.round((Math.min(k, 5) / 5) * text.length));

export function heroAt(t) {
  const k = Math.min(HERO_LAST, t / STEP);
  const step = Math.floor(k);
  const timer = 30 - step;
  return {
    timer,
    bar: timer / 30,
    typed: step < 6 ? typing(ARTIST, k) : step < 12 ? typing(TITLE, k - 6) : "",
    artist: step >= 6,
    title: step >= 12,
    press: (k >= 6 && k < 6.3) || (k >= 12 && k < 12.3),
    found: HERO_EVENTS.filter(([at]) => step >= at).map(([, n]) => n),
    rows: ranking(HERO_BASE, HERO_EVENTS, step, 2.5),
  };
}

const NAMES = [
  "Léa", "Karim", "Zoé", "Hugo", "Inès", "Sarah", "Malik", "Tom", "Nina", "Yanis",
  "Jade", "Lucas", "Emma", "Noah", "Chloé", "Adam", "Lina", "Sacha", "Rose", "Nathan",
  "Mila", "Théo", "Alice", "Louis", "Manon", "Rayan", "Lou", "Enzo", "Anna", "Gabin",
  "Inaya", "Jules", "Léna", "Hugo B.", "Maël", "Eva", "Nolan", "Clara", "Ilyes", "Sofia",
]; // prettier-ignore
// Arrivée de chaque joueur : lente jusqu'à 12, une pause au seuil, puis la foule
const ARRIVALS = NAMES.map((_, i) => i + 1).reduce(
  (acc, k) => [...acc, acc.at(-1) + (k <= 12 ? 0.26 : k <= 14 ? 0.7 : 0.15)],
  [0],
);
export const PLAYERS_CYCLE = ARRIVALS.at(-1) + 2.2;

export function playersAt(t) {
  const count = Math.max(0, phase(t, ARRIVALS));
  return {
    count,
    over: count > 12,
    rows: NAMES.slice(Math.max(0, count - 8), count)
      .reverse()
      .map((n, i) => ({ n, y: i, rk: pad(count - i) })),
  };
}

// lay : 0 buzzer, 1 « À toi ! », 2 « Bien joué ! »
const BUZZ = [0, 1.6, 1.78, 1.93, 3.33, 4.53, 6.33];
export const BUZZER_CYCLE = 6.83;
export const BUZZER_STILL = 3.5;

export function buzzerAt(t) {
  const p = phase(t, BUZZ);
  return {
    press: p === 1,
    lay: p < 3 ? 0 : p < 5 ? 1 : 2,
    regie: p === 4 || p === 5,
  };
}

const CARD = 2.8;
export const SPECIALS_CYCLE = 3 * CARD;

export function specialsAt(t) {
  const i = Math.floor(t / CARD) % 3;
  return { i, n: 4 - Math.floor((t % CARD) / 0.7) };
}

export const NIGHT = [
  ["Léa", [34, 61, 93]],
  ["Karim", [29, 60, 88]],
  ["Zoé", [31, 52, 80]],
  ["Hugo", [22, 45, 66]],
];
// parties 1 à 3, podium, puis 3e, 2e, 1re place
const NIGHT_MARKS = [0.5, 1.9, 3.3, 5.5, 6, 6.8, 7.6];
export const NIGHT_CYCLE = 10.8;
export const NIGHT_STILL = 9;

export function nightAt(t) {
  const p = phase(t, NIGHT_MARKS);
  return { game: Math.min(p, 2), podium: p >= 3, places: Math.max(0, p - 3) };
}

export function calm() {
  return (
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("no-animations")
  );
}

// Attachement : fait avancer t tant que la démo est visible ; mouvements réduits = figé sur still
export const clock = (cycle, still, set) => (el) => {
  if (calm()) {
    set(still);
    return;
  }
  let t = 0;
  set(t);
  return visibleLoop(el, (dt) => {
    t = (t + dt) % cycle;
    set(t);
  });
};
