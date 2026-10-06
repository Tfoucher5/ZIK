import { PHONE, pan } from "./common.mjs";
export default {
  duration: 20,
  scenes: [
    {
      type: "hook",
      a: 0,
      b: 2.9,
      lines: [
        ["Années 80,", ""],
        ["rap FR,", "acc"],
        ["Disney…", ""],
      ],
      sticker: { text: "À toi de choisir", x: 430, y: 1060, r: -5, at: 1.1 },
      bg: { rec: "st_rooms", t: 0 },
    },
    {
      type: "clip",
      a: 2.7,
      b: 9.6,
      rec: "st_themes",
      from: 0,
      dev: PHONE,
      cam: pan(1165, 2700, 1.3, 6.6),
      cap: {
        kick: "Thèmes",
        title: "Un thème, <em>une soirée</em>",
        sub: "Époques, styles, occasions.",
      },
    },
    {
      type: "clip",
      a: 9.4,
      b: 15.8,
      rec: "st_rooms",
      from: 0,
      dev: PHONE,
      cam: pan(1165, 3500, 1.2, 6.0),
      cap: {
        kick: "Rooms en ligne",
        title: "Rejoins une <em>room</em>",
        sub: "Officielles, en QCM, ou crée la tienne.",
      },
    },
    { type: "outro", a: 15.6, b: 20, line: "Gratuit · sans appli" },
  ],
};
