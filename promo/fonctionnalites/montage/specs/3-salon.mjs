const TV = { kind: "tv", x: 60, y: 560, w: 960, h: 540 };
const ph = (x, rec, from, at) => ({
  kind: "phone",
  x,
  y: 1190,
  w: 300,
  h: 650,
  rec,
  from,
  at,
});
export default {
  duration: 25,
  scenes: [
    {
      type: "hook",
      a: 0,
      b: 2.9,
      lines: [
        ["Ce soir,", ""],
        ["c’est", ""],
        ["blind test.", "acc"],
      ],
      sticker: { text: "Sans appli", x: 560, y: 1010, r: -5, at: 1.1 },
      bg: { rec: "salon3_Julie", t: 27 },
    },
    {
      type: "clip",
      a: 2.7,
      b: 9.4,
      rec: "salon3_tv",
      from: 0.6,
      dev: TV,
      extra: [
        ph(200, "salon3_Julie", 0.6, 0.3),
        ph(580, "salon3_Karim", 0.6, 0.5),
      ],
      cap: {
        kick: "Mode Salon",
        title: "Ta TV + <em>vos téléphones</em>",
        sub: "Un code, un pseudo, et c’est parti.",
      },
    },
    {
      type: "clip",
      a: 9.2,
      b: 16.4,
      rec: "salon3_tv",
      from: 24.4,
      dev: TV,
      enter: false,
      extra: [
        ph(200, "salon3_Julie", 24.4, 0),
        ph(580, "salon3_Karim", 24.4, 0),
      ],
      cap: {
        kick: "Jusqu’à 12 joueurs",
        title: "Tout le monde <em>joue</em>",
        sub: "En équipes ou chacun pour soi.",
      },
    },
    {
      type: "clip",
      a: 16.2,
      b: 21.2,
      rec: "salon3_tv",
      from: 55.0,
      dev: { kind: "tv", x: 140, y: 600, w: 800, h: 1000 },
      cam: [{ t: 0, s: 4.0, x: 1690, y: 360 }],
      stickers: [
        { text: "Rouge passe devant !", x: 300, y: 1450, a: 2.4, r: -4 },
      ],
      cap: {
        kick: "Score en direct",
        title: "Quelle équipe <em>gagne&nbsp;?</em>",
        sub: "Classement des équipes sur la TV.",
      },
    },
    {
      type: "outro",
      a: 21,
      b: 25,
      kick: "Mode Salon",
      line: "Le blind test de soirée",
    },
  ],
};
