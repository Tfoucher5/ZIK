import { PHONE } from "./common.mjs";
export default {
  duration: 22.5,
  scenes: [
    {
      type: "hook",
      a: 0,
      b: 2.9,
      lines: [
        ["Tu la", ""],
        ["reconnais", ""],
        ["en combien", "acc"],
        ["de secondes ?", "acc"],
      ],
      bg: { rec: "classic3", t: 30 },
    },
    {
      type: "clip",
      a: 2.7,
      b: 11.2,
      rec: "classic3",
      from: 5.0,
      dev: PHONE,
      cap: {
        kick: "Blind test en ligne",
        title: "Tape l’artiste <em>et le titre</em>",
        sub: "Chaque seconde compte.",
      },
      stickers: [
        { text: "Artiste ! +3", x: 610, y: 1150, a: 2.3, b: 4.3, r: -6 },
        { text: "Titre ! +3", x: 600, y: 1240, a: 4.3, r: 5, ink: true },
      ],
    },
    {
      type: "clip",
      a: 11.0,
      b: 18.6,
      rec: "tab1",
      from: 8.6,
      dev: { x: 60, y: 540, w: 960, h: 1381 },
      cam: [
        { t: 0, s: 1, x: 533, y: 767 },
        { t: 2.4, s: 1, x: 533, y: 767 },
        { t: 3.4, s: 2.1, x: 250, y: 330 },
        { t: 7.6, s: 2.1, x: 250, y: 330 },
      ],
      cap: {
        kick: "Multijoueur",
        title: "Bats tes <em>potes</em>",
        sub: "Classement en direct, manche après manche.",
      },
      stickers: [{ text: "Tu passes 1er !", x: 470, y: 1180, a: 4.2, r: -5 }],
    },
    { type: "outro", a: 18.4, b: 22.5, line: "Gratuit · sans appli" },
  ],
};
