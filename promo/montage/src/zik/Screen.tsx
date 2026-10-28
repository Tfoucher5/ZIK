import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Rec, RecIndex } from "./Rec";
import { H, W } from "./theme";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// d = durée de la transition en frames (12 = doux, 4 = zoom sec sur un mot fort)
export type Zoom = {
  at: number;
  s: number;
  x?: number;
  y?: number;
  d?: number;
};

// Enregistrement d'écran plein cadre comme dans CapCut : capture entière (hauteur 1920) sur un fond flouté
// d'elle-même, avec des zooms en images clés. x/y = point visé en fraction de la capture (0,5 = centre), ramené au milieu.
export const Screen: React.FC<{
  name: string;
  index: RecIndex;
  from: number;
  speed?: number;
  zooms?: Zoom[];
}> = ({ name, index, from, speed, zooms = [{ at: 0, s: 1 }] }) => {
  const f = useCurrentFrame();
  const k = zooms.filter((z) => z.at <= f).at(-1) ?? zooms[0];
  const prev = zooms[zooms.indexOf(k) - 1] ?? k;
  const p = interpolate(f, [k.at, k.at + (k.d ?? 12)], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const lerp = (a: number, b: number) => a + (b - a) * p;
  const s = lerp(prev.s, k.s);
  const x = lerp(prev.x ?? 0.5, k.x ?? 0.5);
  const y = lerp(prev.y ?? 0.5, k.y ?? 0.5);
  const w = (H * index.w) / index.h;
  // Recadrage : le point (x, y) de la capture est ramené vers le milieu de l'écran, sans laisser de vide
  // (sauf jusqu'à 600 px sous la capture pour remonter le champ de saisie hors de l'interface TikTok)
  const px = W / 2 + (x - 0.5) * w;
  const tx = clamp(W / 2 - px * s, W * (1 - s), 0);
  const ty = clamp(
    H * 0.45 - y * H * s,
    H * (1 - s) - 600 * Math.min(1, (s - 1) / 0.3),
    0,
  );
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          filter: "blur(40px) brightness(.45)",
          transform: "scale(1.2)",
        }}
      >
        <Rec name={name} index={index} from={from} speed={speed} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
          transformOrigin: "0 0",
        }}
      >
        <div style={{ width: w, height: H, margin: "0 auto" }}>
          <Rec name={name} index={index} from={from} speed={speed} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
