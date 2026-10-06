import { PH, cam, C } from "./common.mjs";
const P = cam(PH, 1375);
const sy = (ry) => 960 + (ry - P.y) * P.k;
const rounds = [
  { from: 5.0, emo: "☔️ 🎤 🌧️", ok: 1, name: "Rihanna – Umbrella" },
  { from: 21.0, emo: "🧪 ☠️ 💋", ok: 3, name: "Britney Spears – Toxic" },
  { from: 58.0, emo: "🏥 🍸 🙅‍♀️", ok: 1, name: "Amy Winehouse – Rehab" },
];
const shots = [],
  caps = [],
  fx = [];
const HOOK = 2.8,
  R = 6.4;
shots.push({ a: 0, b: HOOK, rec: "qcm2", from: 5.0, speed: 0, cam: C(P) });
caps.push({
  a: 0.1,
  b: HOOK,
  y: 60,
  k: "Défi",
  t: "Trouve la chanson|*avec 3 emojis*",
  s: "3 questions. Réponds 1, 2, 3 ou 4 en commentaire.",
});
rounds.forEach((r, i) => {
  const a = HOOK + i * R;
  shots.push({
    a,
    b: a + R,
    rec: "qcm2",
    from: r.from,
    speed: 0,
    cam: C(P),
    slide: i > 0,
  });
  caps.push({
    a: a + 0.05,
    b: a + 4.4,
    y: 60,
    k: `Question ${i + 1} / 3`,
    t: r.emo,
    size: 190,
  });
  caps.push({
    a: a + 4.4,
    b: a + R,
    y: 60,
    k: `Question ${i + 1} / 3`,
    t: `Réponse *${r.ok + 1}*`,
    s: r.name,
  });
  [0, 1, 2, 3].forEach((n) =>
    fx.push({
      type: "stamp",
      cls: "num ink",
      a: a + 0.3 + n * 0.08,
      b: a + R,
      x: 990,
      y: sy(1734 + n * 148),
      size: 70,
      text: String(n + 1),
      r: 0,
    }),
  );
  [3, 2, 1].forEach((n, k) =>
    fx.push({
      type: "stamp",
      cls: "num yl",
      a: a + 1.3 + k * 1.0,
      b: a + 2.3 + k * 1.0,
      x: 540,
      y: 1020,
      size: 140,
      text: String(n),
      r: 0,
    }),
  );
  fx.push({
    type: "stamp",
    cls: "num gr",
    a: a + 4.4,
    b: a + R,
    x: 990,
    y: sy(1734 + r.ok * 148),
    size: 70,
    text: String(r.ok + 1),
    r: 0,
  });
  fx.push({
    type: "ring",
    a: a + 4.4,
    b: a + R,
    x: 18,
    y: sy(1671 + r.ok * 148) - 10,
    w: 1044,
    h: 146,
    color: "#16b862",
  });
  fx.push({ type: "confetti", a: a + 4.4, b: a + R, x: 540, y: 900 });
});
const E = HOOK + rounds.length * R;
shots.push({ a: E, b: E + 3, rec: "qcm2", from: 59.5, speed: 0, cam: C(P) });
caps.push({
  a: E + 0.1,
  b: E + 3,
  y: 760,
  k: "Alors ?",
  t: "Ton score sur 3 ?|*Dis-le en commentaire* 👇",
  s: "Et tague un pote pour le défier.",
});
export default {
  duration: E + 5.2,
  shots,
  caps,
  fx,
  outro: {
    a: E + 3,
    l1: "Joue en *QCM*|avec le son 🎵",
    l3: "Gratuit · sans appli",
  },
};
