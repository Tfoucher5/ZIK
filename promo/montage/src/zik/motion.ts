import { Easing, interpolate, spring } from "remotion";
import { FPS } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Entrée « slam » : arrive d'une direction avec dépassement, flou de mouvement pendant le trajet
export function slam(
  f: number,
  at: number,
  dir: "left" | "right" | "up" | "down" | "zoom" = "zoom",
  dist = 900,
) {
  const p = spring({
    frame: f - at,
    fps: FPS,
    config: { damping: 13, stiffness: 210, mass: 0.7 },
  });
  const v = Math.abs(
    p -
      spring({
        frame: f - at - 1,
        fps: FPS,
        config: { damping: 13, stiffness: 210, mass: 0.7 },
      }),
  );
  const d = (1 - p) * dist;
  const t = {
    left: `translateX(${-d}px)`,
    right: `translateX(${d}px)`,
    up: `translateY(${-d}px)`,
    down: `translateY(${d}px)`,
    zoom: `scale(${0.2 + 0.8 * p})`,
  }[dir];
  const axis = dir === "up" || dir === "down" ? "Y" : "X";
  return {
    opacity: f < at ? 0 : Math.min(1, p * 3),
    transform: t,
    filter: v > 0.02 ? `blur(${Math.min(18, v * 60)}px)` : "none",
    // flou orienté : on l'approche en étirant légèrement l'élément dans le sens du mouvement
    scale: v > 0.02 ? (axis === "X" ? `${1 + v} 1` : `1 ${1 + v}`) : undefined,
  } as React.CSSProperties;
}

// Sortie rapide (fondu + recul) à partir de `at`
export const out = (f: number, at: number, len = 5) =>
  interpolate(f, [at, at + len], [1, 0], clamp);

// Pulsation sur la grille : 1 sur chaque temps puis décroissance
export function pulse(f: number, beats: number[], decay = 5) {
  let last = -1e9;
  for (const b of beats) {
    if (b > f) break;
    last = b;
  }
  return Math.exp(-(f - last) / decay);
}

// Décalage des couches rouge/bleu (glitch) pendant `len` frames après `at`
export const glitch = (f: number, at: number, len = 4) =>
  f >= at && f < at + len ? (1 - (f - at) / len) * 14 : 0;

// Progression facilitée entre deux frames
export const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
