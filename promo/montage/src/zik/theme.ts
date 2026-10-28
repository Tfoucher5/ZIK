import { loadFont as loadBarlow } from "@remotion/google-fonts/Barlow";
import { loadFont as loadCondensed } from "@remotion/google-fonts/BarlowCondensed";

export const FPS = 30;
export const W = 1080;
export const H = 1920;
// Zone visible sur TikTok (le reste passe sous l'interface) : texte uniquement là-dedans
export const SAFE = { x: 60, y: 160, w: 880, h: 1320 };

export const C = {
  bg: "#080808",
  pink: "#ff00ff",
  text: "#fafafa",
  ok: "#22c55e",
};

// Polices de ZIK (titres condensés en capitales, texte courant)
export const { fontFamily: COND } = loadCondensed("normal", {
  weights: ["800"],
  subsets: ["latin", "latin-ext"],
});
export const { fontFamily: BODY } = loadBarlow("normal", {
  weights: ["500", "600"],
  subsets: ["latin", "latin-ext"],
});
