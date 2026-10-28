import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FPS } from "./theme";

export type Beats = {
  bpm: number;
  beats: number[];
  bars: number[];
  drop: number;
};

// Grille d'un son (scripts/beats.mjs) : B(i) = frame du i-ème temps, en partant du premier temps de mesure
// (scripts/apercu.mjs colle l'extrait à partir de ce même temps)
export function grid(b: Beats) {
  const BEAT = (60 / b.bpm) * FPS;
  return { BEAT, B: (i: number) => Math.round(i * BEAT) };
}

// Finition commune : flash blanc sur les coupes `cuts` + grain qui bouge
export const Finish: React.FC<{ cuts: number[] }> = ({ cuts }) => {
  const f = useCurrentFrame();
  return (
    <>
      <AbsoluteFill
        style={{
          background: "#fff",
          mixBlendMode: "screen",
          pointerEvents: "none",
          opacity: cuts.reduce(
            (o, b) => o + (f >= b && f < b + 3 ? (3 - (f - b)) * 0.08 : 0),
            0,
          ),
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,.045) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
          backgroundPosition: `${(f * 3) % 4}px ${(f * 5) % 4}px`,
        }}
      />
    </>
  );
};

// Dégradé sombre en haut pour garder les titres lisibles sur une capture
export const TopShade: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "linear-gradient(180deg, rgba(8,8,8,.92) 0%, rgba(8,8,8,.6) 28%, transparent 45%)",
    }}
  />
);
