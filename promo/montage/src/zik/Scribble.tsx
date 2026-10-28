import { useCurrentFrame } from "remotion";
import { ease } from "./motion";

// Entourage tracé à la main (feutre) autour d'une zone, dessiné en `len` frames à partir de `at`
export const Scribble: React.FC<{
  at: number;
  w: number;
  h: number;
  color?: string;
  len?: number;
  style?: React.CSSProperties;
}> = ({ at, w, h, color = "#ffe14d", len = 9, style }) => {
  const p = ease(useCurrentFrame(), at, at + len);
  // Ellipse irrégulière qui dépasse un peu son point de départ, comme un vrai trait
  const pts: string[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2.15 - 0.4;
    const wob = 1 + 0.035 * Math.sin(i * 1.7) + 0.02 * Math.cos(i * 3.1);
    pts.push(
      `${(w / 2 + Math.cos(a) * (w / 2) * wob).toFixed(1)},${(h / 2 + Math.sin(a) * (h / 2) * wob * 0.92).toFixed(1)}`,
    );
  }
  const total = 2.2 * Math.PI * Math.max(w, h);
  return (
    <svg
      width={w}
      height={h}
      style={{
        position: "absolute",
        overflow: "visible",
        pointerEvents: "none",
        ...style,
      }}
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={total}
        strokeDashoffset={total * (1 - p)}
        style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,.5))" }}
      />
    </svg>
  );
};
