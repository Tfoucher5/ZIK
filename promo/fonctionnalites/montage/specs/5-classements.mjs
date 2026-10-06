import { PHONE, pan } from "./common.mjs";
export default {
  duration: 20,
  scenes: [
    {
      type: "hook",
      a: 0,
      b: 2.9,
      lines: [
        ["Qui a", ""],
        ["la meilleure", ""],
        ["oreille ?", "acc"],
      ],
      bg: { rec: "st_lb", t: 0 },
    },
    {
      type: "clip",
      a: 2.7,
      b: 9.8,
      rec: "st_lb",
      from: 0,
      dev: PHONE,
      cam: pan(1165, 2900, 1.4, 6.6),
      cap: {
        kick: "Hit-parade",
        title: "Grimpe au <em>classement</em>",
        sub: "ELO, score, séries de victoires.",
      },
    },
    {
      type: "clip",
      a: 9.6,
      b: 15.8,
      rec: "st_defi",
      from: 0,
      dev: PHONE,
      cam: pan(1165, 1900, 1.6, 5.2),
      cap: {
        kick: "Défi de la semaine",
        title: "Toute la commu <em>joue ensemble</em>",
        sub: "Un objectif collectif chaque semaine.",
      },
      stickers: [
        { text: "3 712 / 5 000", x: 560, y: 1330, a: 1.2, b: 3.6, r: -5 },
      ],
    },
    { type: "outro", a: 15.6, b: 20, line: "Gratuit · sans appli" },
  ],
};
