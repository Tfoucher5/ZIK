import type { Box } from "./Cut";

// Vrais éléments de ZIK repérés dans les captures (pixels de capture, 1075 de large)

// qcm-2000 : 01745.jpg = manche Maluma avant la réponse, 01821.jpg = juste après (+913)
export const QCM = {
  rec: "qcm-2000",
  before: "01745.jpg",
  after: "01821.jpg",
  buttons: [1675, 1822, 1970, 2117].map((y) => ({
    x: 30,
    y,
    w: 1015,
    h: 125,
  })) as Box[],
  vinyl: { x: 207, y: 432, w: 661, h: 661 } as Box,
  feedback: { x: 262, y: 1232, w: 551, h: 60 } as Box,
};

// rapfr : 12510.jpg = révélation Rambo Goyard avec carte Mythique
export const REVEAL = {
  rec: "rapfr",
  frame: "12510.jpg",
  card: { x: 110, y: 1435, w: 855, h: 445 } as Box,
  album: { x: 225, y: 345, w: 737, h: 630 } as Box,
};

// accueil : photos des sections du nouvel accueil (scripts/capture.mjs, action shot)
export const HOME = {
  rec: "accueil",
  headline: {
    frame: "hero.png",
    box: { x: 40, y: 150, w: 720, h: 470 } as Box,
  },
  ctas: { frame: "hero.png", box: { x: 40, y: 880, w: 700, h: 330 } as Box },
  salon: { frame: "hero.png", box: { x: 62, y: 1246, w: 955, h: 1185 } as Box },
  tiles: [
    { x: 35, y: 790, w: 495, h: 690 },
    { x: 550, y: 790, w: 490, h: 690 },
    { x: 35, y: 1490, w: 495, h: 670 },
    { x: 550, y: 1470, w: 490, h: 670 },
    { x: 550, y: 3550, w: 490, h: 660 },
  ].map((box) => ({ frame: "rooms.png", box })),
  // Toutes les rooms du mur, par nom (polaroïd entier, légende comprise)
  rooms: {
    rapfr: { x: 35, y: 790, w: 495, h: 690 },
    chanson: { x: 550, y: 790, w: 490, h: 690 },
    annees2000: { x: 35, y: 1490, w: 495, h: 670 },
    annees70: { x: 550, y: 1470, w: 490, h: 670 },
    annees8090: { x: 35, y: 2190, w: 495, h: 680 },
    techno: { x: 550, y: 2160, w: 490, h: 690 },
    rapus: { x: 35, y: 2880, w: 495, h: 660 },
    rock: { x: 550, y: 2900, w: 490, h: 650 },
    disney: { x: 550, y: 3550, w: 490, h: 660 },
  } as Record<string, Box>,
  // Top joueurs (top.png) : une ligne par rang, et la zone du pseudo à flouter
  topRows: [410, 622, 834, 1046, 1258].map((y) => ({
    x: 20,
    y,
    w: 1035,
    h: 180,
  })) as Box[],
  topName: { x: 230, w: 460 },
  features: [
    { x: 44, y: 371, w: 478, h: 707 },
    { x: 544, y: 371, w: 482, h: 707 },
    { x: 44, y: 1105, w: 478, h: 703 },
    { x: 544, y: 1105, w: 482, h: 703 },
  ].map((box) => ({ frame: "features.png", box })),
};
