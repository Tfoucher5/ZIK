import { PH, cam, C } from "./common.mjs";
const P = cam(PH, 1165);
const songs = [
  ["classic3", 23.5],
  ["classic3", 49.2],
  ["classic3", 86.8],
];
const shots = [],
  caps = [],
  fx = [];
const HOOK = 2.8,
  R = 5.8;
shots.push({
  a: 0,
  b: HOOK,
  rec: "classic3",
  from: 24,
  speed: 0.15,
  cam: C(P),
});
caps.push({
  a: 0.1,
  b: HOOK,
  y: 60,
  k: "Défi",
  t: "Devine l’artiste|*avec la pochette floutée*",
  s: "3 manches. Compte tes points !",
});
fx.push(
  {
    type: "veil",
    a: 0,
    b: HOOK,
    x: 200,
    y: 375,
    w: 680,
    h: 670,
    b0: 60,
    b1: 60,
  },
  {
    type: "mask",
    a: 0,
    b: HOOK,
    x: 140,
    y: 1140,
    w: 800,
    h: 200,
    text: "???",
    size: 110,
  },
);
songs.forEach(([rec, rs], i) => {
  const a = HOOK + i * R;
  shots.push({
    a,
    b: a + R,
    rec,
    from: rs + 0.5,
    speed: 0.15,
    cam: C(P),
    slide: false,
  });
  caps.push({
    a: a + 0.05,
    b: a + 4,
    y: 60,
    k: `Manche ${i + 1} / 3`,
    t: "Qui est-ce ?",
    s: "Réponds avant la fin du compte à rebours.",
  });
  caps.push({
    a: a + 4,
    b: a + R,
    y: 60,
    k: `Manche ${i + 1} / 3`,
    t: "*Réponse !*",
    s: "Un point si tu l’avais.",
  });
  fx.push({
    type: "veil",
    a,
    b: a + 4,
    x: 200,
    y: 375,
    w: 680,
    h: 670,
    b0: 55 - i * 5,
    b1: 22 - i * 3,
    d: 4,
  });
  fx.push({
    type: "mask",
    a,
    b: a + 4,
    x: 140,
    y: 1140,
    w: 800,
    h: 200,
    text: "???",
    size: 110,
  });
  [3, 2, 1].forEach((n, k) =>
    fx.push({
      type: "stamp",
      cls: "num",
      a: a + 0.8 + k * 1.05,
      b: a + 1.8 + k * 1.05,
      x: 540,
      y: 1560,
      size: 150,
      text: String(n),
      r: 0,
    }),
  );
  fx.push({ type: "confetti", a: a + 4, b: a + R, x: 540, y: 700 });
});
const E = HOOK + songs.length * R;
shots.push({
  a: E,
  b: E + 3,
  rec: "classic3",
  from: 88,
  speed: 0.15,
  cam: C(P),
  slide: false,
});
fx.push({
  type: "veil",
  a: E,
  b: E + 3,
  x: 0,
  y: 0,
  w: 1080,
  h: 1920,
  b0: 30,
  b1: 30,
});
caps.push({
  a: E + 0.1,
  b: E + 3,
  y: 760,
  k: "Alors ?",
  t: "Combien t’en as trouvé\u00a0?|*Dis-le en commentaire*\u00a0👇",
  s: "0, 1, 2 ou 3 sur 3…",
});
export default {
  duration: E + 5.2,
  shots,
  caps,
  fx,
  outro: {
    a: E + 3,
    l1: "Sur ZIK, tu devines|*avec le son* 🎵",
    l3: "Gratuit · sans appli",
  },
};
