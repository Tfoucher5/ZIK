const TV = (c = { t: 0, s: 1 }) => ({
  kind: "tv",
  rec: "salon3_tv",
  x: 40,
  y: 330,
  w: 1000,
  h: 563,
  cam: [c],
});
const ph = (rec, x) => ({
  kind: "phone",
  rec,
  x,
  y: 975,
  w: 400,
  h: 867,
  cam: [{ t: 0, s: 1 }],
});
const lay = (a, b, from, slide, c) => ({
  a,
  b,
  from,
  bg: "dark",
  slide,
  panels: [TV(c), ph("salon3_Julie", 110), ph("salon3_Karim", 570)],
});
export default {
  duration: 15.2,
  shots: [
    lay(0, 3.2, 13),
    lay(3.2, 6.6, 25.4, false),
    lay(6.6, 10.2, 55.6, false, { t: 0, s: 2, x: 1440, y: 300 }),
    lay(10.2, 13.2, 75, false),
  ],
  caps: [
    {
      a: 0.1,
      b: 3.2,
      y: 40,
      k: "POV",
      t: "Tu lances un blind test *sur la TV* 📺",
      s: "Et ton pote se croit imbattable.",
    },
    {
      a: 3.2,
      b: 6.6,
      y: 40,
      k: "Ton pote",
      t: "« Trop *facile* »",
      s: "Spoiler : non.",
    },
    {
      a: 6.6,
      b: 10.2,
      y: 40,
      k: "Une manche plus tard",
      t: "Son équipe *passe 2e* 😭",
      s: "Le classement ne ment pas.",
    },
    {
      a: 10.2,
      b: 13.2,
      y: 40,
      k: "À toi",
      t: "Tague le pote qui se croit *imbattable* 👇",
      s: "Revanche ce soir sur zik-music.fr",
    },
  ],
  fx: [
    { type: "ring", a: 6.9, b: 10.2, x: 495, y: 390, w: 545, h: 495 },
    {
      type: "stamp",
      a: 8.25,
      b: 10.2,
      x: 540,
      y: 935,
      size: 84,
      text: "Rouge passe devant !",
      r: -4,
    },
    { type: "confetti", a: 8.25, b: 9.8, x: 540, y: 700 },
  ],
  outro: {
    a: 13.2,
    l1: "Le blind test|de *soirée*",
    l3: "Ta TV + vos téléphones · sans appli",
  },
};
