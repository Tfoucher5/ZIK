import { PHONE } from "./common.mjs";
export default {
  duration: 21,
  scenes: [
    {
      type: "hook",
      a: 0,
      b: 2.9,
      lines: [
        ["Une chanson", ""],
        ["par jour.", "acc"],
      ],
      sticker: { text: "6 essais", x: 640, y: 920, r: 6, at: 1.0 },
      bg: { rec: "zik2", t: 10 },
    },
    {
      type: "clip",
      a: 2.7,
      b: 17,
      rec: "zik2",
      from: 0.8,
      speed: 1.4,
      dev: PHONE,
      cap: {
        kick: "Zikle",
        title: "Trouve le <em>son du jour</em>",
        sub: "Chaque essai raté débloque un peu plus de musique.",
      },
      stickers: [
        { text: "Raté !", x: 640, y: 760, a: 3.2, b: 6.5, r: -6 },
        {
          text: "Trouvé en 3 essais",
          x: 380,
          y: 1500,
          a: 13.0,
          r: -4,
          ink: true,
        },
      ],
    },
    {
      type: "outro",
      a: 16.8,
      b: 21,
      kick: "Zikle · chanson du jour",
      line: "La même pour tout le monde",
    },
  ],
};
