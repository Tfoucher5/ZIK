import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import beatsJson from "../../public/ref/kore.beats.json";
import { Cover } from "../zik/Cover";
import { Cut } from "../zik/Cut";
import { HOME } from "../zik/elements";
import { Finish, grid } from "../zik/kit";
import { pulse, slam } from "../zik/motion";
import { Scribble } from "../zik/Scribble";
import { C, COND } from "../zik/theme";
import { MONO, Title } from "../zik/Title";

// « Défie ton poto » sur « Mon poto » (Kore) : le vrai top 5 ELO de l'accueil remonte ligne par ligne,
// pseudos floutés (ce sont de vrais joueurs), puis la ligne vide « toi ».
const { BEAT, B } = grid(beatsJson);
export const CLASSEMENT_LEN = B(14) + B(6);
const ROW_W = 860;
const K = ROW_W / HOME.topRows[0].w;

export const Classement: React.FC = () => {
  const f = useCurrentFrame();
  const p = pulse(
    f,
    Array.from({ length: 20 }, (_, i) => B(i)),
    6,
  );
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence durationInFrames={B(8)}>
        <Title
          top={190}
          size={110}
          kicker={["Classement ELO · en direct", 0]}
          lines={[
            ["Le top 5", 0],
            ["*de ZIK.*", B(1)],
          ]}
        />
      </Sequence>
      <Sequence from={B(8)} durationInFrames={B(6)}>
        <Title
          top={190}
          size={110}
          lines={[
            ["Et toi,", 0],
            ["*t'es où ?*", B(1)],
          ]}
        />
      </Sequence>

      {/* Du 5e au 1er, un rang par temps */}
      {HOME.topRows.map((box, i) => {
        const at = B(2 + (4 - i) * 0.5);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 80,
              top: 480 + i * (box.h * K + 14),
              ...slam(f, at, "right", 1100),
            }}
          >
            <div style={{ position: "relative" }}>
              <Cut
                rec={HOME.rec}
                frame="top.png"
                box={box}
                width={ROW_W}
                radius={6}
                style={{ border: "2px solid rgba(255,255,255,.08)" }}
              />
              <div
                style={{
                  position: "absolute",
                  left: (HOME.topName.x - box.x) * K - 70,
                  top: 18,
                  width: HOME.topName.w * K + 190,
                  height: box.h * K - 36,
                  backdropFilter: "blur(14px)",
                  background: "rgba(8,8,8,.25)",
                  borderRadius: 8,
                }}
              />
              {i === 0 && (
                <Scribble
                  at={B(5)}
                  w={ROW_W + 60}
                  h={box.h * K + 50}
                  style={{ left: -30, top: -25 }}
                  color={C.pink}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* La place libre */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 480 + 5 * (HOME.topRows[0].h * K + 14),
          ...slam(f, B(9), "up", 500),
        }}
      >
        <div
          style={{
            width: ROW_W,
            height: HOME.topRows[0].h * K,
            border: `3px dashed ${C.pink}`,
            display: "flex",
            alignItems: "center",
            gap: 40,
            padding: "0 40px",
            transform: `scale(${1 + 0.02 * p})`,
          }}
        >
          <span
            style={{
              fontFamily: COND,
              fontWeight: 800,
              fontSize: 100,
              color: C.pink,
            }}
          >
            6
          </span>
          <span
            style={{
              fontFamily: COND,
              fontWeight: 800,
              fontSize: 70,
              color: C.text,
              textTransform: "uppercase",
            }}
          >
            Ton poto ?
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: MONO,
              fontSize: 30,
              color: "#8896aa",
              letterSpacing: "0.2em",
            }}
          >
            PLACE LIBRE
          </span>
        </div>
      </div>

      <Sequence from={B(14)}>
        <Cover beat={BEAT} kicker="Défie ton poto · gratuit" />
      </Sequence>
      <Finish cuts={[B(8), B(14)]} />
    </AbsoluteFill>
  );
};
