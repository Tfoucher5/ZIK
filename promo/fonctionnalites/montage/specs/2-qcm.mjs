import { PHONE } from "./common.mjs";
export default {
  duration: 20.5,
  scenes: [
    {
      type: "hook",
      a: 0,
      b: 2.9,
      lines: [
        ["Nul en", ""],
        ["blind test ?", "acc"],
      ],
      sticker: { text: "Joue en 4 choix", x: 120, y: 900, r: -4, at: 1.0 },
      bg: { rec: "qcm2", t: 6 },
    },
    {
      type: "clip",
      a: 2.7,
      b: 10.4,
      rec: "qcm2",
      from: 3.4,
      dev: PHONE,
      cap: {
        kick: "Mode QCM",
        title: "4 choix, <em>1 seule bonne</em>",
        sub: "Pas besoin d’être un expert.",
      },
      stickers: [{ text: "Bonne réponse !", x: 520, y: 1000, a: 2.8, r: -5 }],
    },
    {
      type: "clip",
      a: 10.2,
      b: 16.6,
      rec: "qcm2",
      from: 19.6,
      dev: PHONE,
      cap: {
        kick: "Rapidité",
        title: "Plus tu vas vite, <em>plus tu marques</em>",
        sub: "",
      },
      stickers: [
        { text: "+951 pts", x: 600, y: 1000, a: 3.3, r: 5, ink: true },
      ],
    },
    { type: "outro", a: 16.4, b: 20.5, line: "Gratuit · sans appli" },
  ],
};
