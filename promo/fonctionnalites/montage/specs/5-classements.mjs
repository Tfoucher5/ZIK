import { cam, box, C } from "./common.mjs";
const LB = { w: 1075, h: 8233 },
  DF = { w: 1075, h: 6098 };
const L = cam(LB, 1055),
  L2 = cam(LB, 3600),
  D = cam(DF, 1055),
  D2 = cam(DF, 1750);
export default {
  duration: 18.5,
  shots: [
    { a: 0, b: 3.5, rec: "st_lb", from: 0, cam: C(L) },
    { a: 3.5, b: 7, rec: "st_lb", from: 0, cam: C(L), slide: false },
    {
      a: 7,
      b: 10,
      rec: "st_lb",
      from: 0,
      cam: [
        ...C(L),
        { t: 0.4, s: 1, x: L.x, y: L.y },
        { t: 2.6, s: 1, x: L2.x, y: L2.y },
      ],
      slide: false,
    },
    { a: 10, b: 13.5, rec: "st_defi", from: 0, cam: C(D) },
    {
      a: 13.5,
      b: 16.5,
      rec: "st_defi",
      from: 0,
      cam: [...C(D), { t: 1, s: 1, x: D2.x, y: D2.y }],
      slide: false,
    },
  ],
  caps: [
    {
      a: 0.1,
      b: 3.5,
      y: 40,
      k: "Hit-parade",
      t: "Qui a *la meilleure oreille* ?",
      s: "Le classement de tous les joueurs ZIK.",
    },
    {
      a: 3.5,
      b: 7,
      y: 1500,
      k: "Classement",
      t: "Gagne et *monte ton ELO*",
      s: "Classement à l’ELO ou au score total.",
    },
    {
      a: 7,
      b: 10,
      y: 1500,
      k: "Hit-parade",
      t: "Grimpe *dans le top*",
      s: "Partie après partie.",
    },
    {
      a: 10,
      b: 13.5,
      y: 1500,
      k: "Défi de la semaine",
      t: "Un objectif *pour toute la commu*",
      s: "Chaque bonne réponse fait avancer la jauge.",
    },
    {
      a: 13.5,
      b: 16.5,
      y: 1500,
      k: "Défi de la semaine",
      t: "Les meilleurs *contributeurs*",
      s: "Joue pour grimper dans le classement du défi.",
    },
  ],
  fx: [
    { type: "ring", a: 3.8, b: 5.3, ...box(L, 30, 555, 450, 110, 8) },
    { type: "ring", a: 5.4, b: 7, ...box(L, 320, 1180, 320, 140, 8) },
    { type: "ring", a: 10.4, b: 13.5, ...box(D, 45, 930, 985, 260, 8) },
  ],
  outro: { a: 16.5, l1: "Grimpe *au classement*" },
};
