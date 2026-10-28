import { COND } from "./theme";

// Bouton de réponse QCM de ZIK, reproduit d'après static/css/game/qcm.css (couleur et forme par position)
const COLORS = [
  ["239, 68, 68", "#fca5a5"],
  ["59, 130, 246", "#93c5fd"],
  ["234, 179, 8", "#fde68a"],
  ["34, 197, 94", "#86efac"],
];

export const QcmButton: React.FC<{
  i: number;
  text: string;
  state?: "correct" | "wrong" | "neutral";
  width?: number;
  height?: number;
}> = ({ i, text, state, width = 900, height = 128 }) => {
  const [rgb, color] =
    state === "correct"
      ? ["34, 197, 94", "#d1fae5"]
      : state === "wrong"
        ? ["239, 68, 68", "#fecaca"]
        : COLORS[i];
  const strong = state === "correct" || state === "wrong";
  const shape: React.CSSProperties = [
    { borderRadius: "50%", border: "5px solid currentColor" },
    { transform: "rotate(45deg) scale(.85)", border: "5px solid currentColor" },
    {
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      background: "currentColor",
    },
    { border: "5px solid currentColor" },
  ][i];
  return (
    <div
      style={{
        width,
        minHeight: height,
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "0 36px",
        background: `linear-gradient(135deg, rgba(${rgb}, ${strong ? 0.35 : 0.18}), rgba(${rgb}, ${strong ? 0.15 : 0.08}))`,
        border: `5px solid ${strong ? `rgb(${rgb})` : `rgba(${rgb}, .35)`}`,
        boxShadow:
          state === "correct" ? "0 0 60px rgba(74, 222, 128, .35)" : "none",
        color,
        opacity: state === "neutral" ? 0.35 : 1,
        fontFamily: COND,
        fontWeight: 800,
        fontSize: 58,
        letterSpacing: "0.03em",
        backdropFilter: "blur(6px)",
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          opacity: 0.7,
          boxSizing: "border-box",
          ...shape,
        }}
      />
      {text}
    </div>
  );
};
