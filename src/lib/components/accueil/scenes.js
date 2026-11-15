import { FREE_MAX_PLAYERS } from "../../data/proPlans.js";
import { clamp } from "../ui/scrub.js";

const GRATUIT = `Gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs`;

// Deux films de la salle 3D de /soiree, calés sur le scroll. Une légende est
// affichée quand la progression p est dans [from, to[.
export const PORTE = {
  film: "porte",
  len: 6,
  alt: "De nuit, la devanture en briques d'un bar : enseigne au néon rose « ZIK, blind test ce soir », porte en bois dont le verre est éclairé de l'intérieur, et au-dessus les fenêtres de l'immeuble.",
  sr: "Le film : la porte du bar s'ouvre, on entre dans une soirée blind test. Une TV affiche le chrono et le classement, les joueurs répondent sur leur téléphone, l'un d'eux trouve, puis toute la salle lève les bras devant le podium.",
  flash: 0.8101,
  flashW: 0.016,
  flashMax: 0.9,
  ding: 0.696,
  open: (p) => clamp((p - 0.1) / 0.16),
  caps: [
    {
      from: 0.07,
      to: 0.29,
      h: "Entre, ça joue",
      p: "Derrière la porte, une manche est en cours. Tout le monde cherche le même titre.",
    },
    {
      from: 0.31,
      to: 0.5,
      h: "Une TV, un téléphone chacun",
      p: "La TV passe l'extrait et affiche le classement. Chacun répond sur son téléphone, sans rien installer.",
    },
    {
      from: 0.52,
      to: 0.692,
      h: "Qui chante ?",
      p: "Le chrono tourne. Tu connais cette chanson, tu l'as sur le bout de la langue.",
    },
    {
      from: 0.696,
      to: 0.806,
      big: true,
      h: "Trouvé !",
      p: "Ton nom s'affiche sur la TV, devant toute la salle.",
    },
    {
      from: 0.82,
      to: 1.01,
      h: "Et on en refait une",
      p: "Un podium, une revanche, une nouvelle playlist. C'est ça, une soirée ZIK.",
      cta: ["/salon", "Créer une soirée"],
      note: GRATUIT,
    },
  ],
};

export const ETAGES = {
  film: "etages",
  len: 4.3,
  alt: "La façade de l'immeuble au-dessus du bar : douze fenêtres allumées, dans chacune un joueur au casque. Sous chaque fenêtre, son pseudo et son état : « cherche », « artiste trouvé » ou « a trouvé en 2,1 s » en vert.",
  sr: "Le film : la caméra monte le long de la façade. Les fenêtres s'allument une à une, chaque joueur rejoint la même room. L'extrait part, une fenêtre passe au vert quand son joueur trouve, puis les autres suivent.",
  flash: 0.585,
  flashW: 0.02,
  flashMax: 0.45,
  ding: 0.578,
  open: () => 0.5,
  caps: [
    {
      from: -1,
      to: 0.2,
      id: "t-etages",
      h: "Et aux étages ? Ça joue aussi",
      p: "Pas de soirée ce soir ? Chacun chez soi, tous dans la même partie.",
    },
    {
      from: 0.22,
      to: 0.4,
      h: "Une room, un thème, des joueurs de partout",
      p: "Années 80, rap français, rock… Tu entres dans une room, la manche part aussitôt.",
      note: "Room Années 80 · 12 joueurs",
    },
    {
      from: 0.42,
      to: 0.575,
      h: "Artiste, titre, le plus vite possible",
      p: "Tu tapes ta réponse. Plus elle arrive vite, plus elle rapporte de points.",
      note: "Chacun cherche…",
    },
    {
      from: 0.578,
      to: 0.72,
      big: true,
      h: "Trouvé !",
      p: "Ta fenêtre passe au vert, ton nom grimpe au classement.",
      note: "Jade a trouvé · 2,1 s",
      ok: true,
    },
    {
      from: 0.74,
      to: 1.01,
      h: "Un immeuble, deux façons de jouer",
      p: "En bas, la soirée sur la TV. Aux étages, le jeu en ligne, gratuit, avec ou sans compte.",
      cta: ["/jouer", "Jouer en ligne"],
      note: "Rooms · Zikle du jour · classements",
    },
  ],
};

export const media = (film, forme, ext) =>
  `/media/accueil/${film}-${forme}.v1.${ext}`;

/** Où est le verre de la porte à l'écran : l'affiche est recadrée en « cover ». */
export function glassSpot(W, H, portrait) {
  const [nx, ny, nw, ar] = portrait
    ? [0.5, 0.545, 0.34, 720 / 1560]
    : [0.727, 0.522, 0.2, 16 / 9];
  const s = Math.max(W / ar, H);
  const dw = s * ar;
  return {
    x: (W - dw) / 2 + nx * dw,
    y: (H - s) / 2 + ny * s,
    w: nw * dw * 1.7,
  };
}

export const flashAt = (p, { flash, flashW, flashMax }) =>
  clamp(1 - Math.abs(p - flash) / flashW) * flashMax;
