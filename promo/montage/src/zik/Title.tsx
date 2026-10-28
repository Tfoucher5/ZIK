import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, COND, SAFE } from "./theme";

// Typographie du site : surtitre en chasse fixe espacée, titres condensés en capitales,
// un mot en rose (`*mot*`) ou en contour (`_mot_`), comme « T'AS / L'OREILLE ? / PROUVE-LE. » sur l'accueil.
// Chaque ligne sort d'un masque à sa frame (mouvement éditorial, pas de rebond).

export const MONO = 'ui-monospace, "Cascadia Mono", Consolas, monospace';

const rise = (f: number, at: number, len = 8) =>
  interpolate(f, [at, at + len], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

export const Kicker: React.FC<{
  text: string;
  at?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ text, at = 0, color = C.pink, style }) => {
  const p = rise(useCurrentFrame(), at, 10);
  return (
    <div
      style={{
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

const Styled: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*[^*]+\*|_[^_]+_)/).map((part, i) =>
      part.startsWith("*") ? (
        <span key={i} style={{ color: C.pink }}>
          {part.slice(1, -1)}
        </span>
      ) : part.startsWith("_") ? (
        <span
          key={i}
          style={{ color: "transparent", WebkitTextStroke: "3px #fafafa" }}
        >
          {part.slice(1, -1)}
        </span>
      ) : (
        part
      ),
    )}
  </>
);

// lines : [texte, frame d'apparition][] ; `out` = frame où le bloc s'efface
export const Title: React.FC<{
  lines: [string, number][];
  kicker?: [string, number];
  top?: number;
  size?: number;
  align?: "left" | "center";
  out?: number;
}> = ({
  lines,
  kicker,
  top = SAFE.y + 40,
  size = 150,
  align = "left",
  out = 1e9,
}) => {
  const f = useCurrentFrame();
  const gone = rise(f, out, 6);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.x + 10,
        width: SAFE.w - 20,
        top,
        textAlign: align,
        opacity: 1 - gone,
      }}
    >
      {kicker && (
        <Kicker text={kicker[0]} at={kicker[1]} style={{ marginBottom: 18 }} />
      )}
      {lines.map(([text, at], i) => {
        const p = rise(f, at);
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: 4 }}>
            <div
              style={{
                fontFamily: COND,
                fontWeight: 800,
                fontSize: size,
                lineHeight: 0.92,
                textTransform: "uppercase",
                color: C.text,
                letterSpacing: "-0.01em",
                transform: `translateY(${(1 - p) * 105}%)`,
                textShadow: "0 6px 30px rgba(0,0,0,.55)",
              }}
            >
              <Styled text={text} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Bouton d'action du site : rectangle rose, texte noir condensé, flèche
export const Cta: React.FC<{
  text: string;
  at?: number;
  ghost?: boolean;
  style?: React.CSSProperties;
}> = ({ text, at = 0, ghost, style }) => {
  const p = rise(useCurrentFrame(), at, 8);
  return (
    <div
      style={{
        display: "inline-block",
        fontFamily: COND,
        fontWeight: 800,
        fontSize: 54,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "22px 44px 18px",
        background: ghost ? "transparent" : C.pink,
        color: ghost ? C.text : "#0a0a0a",
        border: ghost ? "3px solid #fafafa" : "3px solid transparent",
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        ...style,
      }}
    >
      {text} →
    </div>
  );
};
