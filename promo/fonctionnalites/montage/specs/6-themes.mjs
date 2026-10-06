import { cam, box, C } from "./common.mjs";
const RO = { w: 1075, h: 7430 },
  TH = { w: 1075, h: 6913 };
const R = cam(RO, 1300),
  R2 = cam(RO, 3900),
  R0 = cam(RO, 955),
  T = cam(TH, 1055),
  T2 = cam(TH, 2600),
  T3 = cam(TH, 3200);
export default {
  duration: 19.5,
  shots: [
    { a: 0, b: 3.5, rec: "st_rooms", from: 0, cam: C(R) },
    {
      a: 3.5,
      b: 7,
      rec: "st_rooms",
      from: 0,
      cam: [...C(R), { t: 3.2, s: 1, x: R2.x, y: R2.y }],
      slide: false,
    },
    { a: 7, b: 10.5, rec: "st_rooms", from: 0, cam: C(R0) },
    { a: 10.5, b: 14, rec: "st_themes", from: 0, cam: C(T) },
    {
      a: 14,
      b: 17.5,
      rec: "st_themes",
      from: 0,
      cam: [
        { t: 0, s: 1, x: T2.x, y: T2.y },
        { t: 3.2, s: 1, x: T3.x, y: T3.y },
      ],
    },
  ],
  caps: [
    {
      a: 0.1,
      b: 3.5,
      y: 40,
      k: "Rooms en ligne",
      t: "Rap, années 80, *Disney*…",
      s: "Rejoins une partie en un clic.",
    },
    {
      a: 3.5,
      b: 7,
      y: 40,
      k: "Rooms en ligne",
      t: "Officielles, *classiques ou QCM*",
      s: "Choisis le style qui te va.",
    },
    {
      a: 7,
      b: 10.5,
      y: 1500,
      k: "À toi de jouer",
      t: "Ou *crée ta room*",
      s: "Avec tes propres playlists.",
    },
    {
      a: 10.5,
      b: 14,
      y: 1500,
      k: "Thèmes",
      t: "Un thème, *une soirée*",
      s: "Années 80, rap français, rock, techno…",
    },
    {
      a: 14,
      b: 17.5,
      y: 1500,
      k: "Thèmes",
      t: "Pour *chaque occasion*",
      s: "Anniversaire, mariage, soirée entre amis…",
    },
  ],
  fx: [{ type: "ring", a: 7.4, b: 10.5, ...box(R0, 635, 175, 405, 110, 8) }],
  outro: { a: 17.5, l1: "Choisis *ton thème*" },
};
