import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import beatsJson from "../../public/ref/lacrim.beats.json";
import rapfr from "../../public/rec/rapfr/index.json";
import { Cover } from "../zik/Cover";
import { Finish, grid } from "../zik/kit";
import { Title } from "../zik/Title";
import { ease } from "../zik/motion";
import { RecIndex } from "../zik/Rec";
import { Screen } from "../zik/Screen";
import { Scribble } from "../zik/Scribble";
import { C, COND, FPS } from "../zik/theme";

// Challenge « trouvé avant que le chrono bouge » sur « LOSE CONTROL » : prise directe, arrêt sur image,
// ralenti façon replay sportif. Vraie partie Rap FR : le minuteur affiche encore 00:29 quand l'artiste est trouvé.
const { BEAT, B } = grid(beatsJson);
const REC = rapfr as unknown as RecIndex;
// Dans la capture : manche lancée à 4,6 s, artiste validé à 5,05 s
const LIVE_FROM = 4.3;
const FOUND = Math.round((5.05 - LIVE_FROM) * FPS);
export const CHRONO_LEN = B(12) + B(6);

const Hud: React.FC<{ label: string; color?: string }> = ({
  label,
  color = "#ef4444",
}) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        top: 175,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: COND,
        fontWeight: 800,
        fontSize: 48,
        color: "#fff",
        letterSpacing: "0.08em",
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: color,
          opacity: Math.floor(f / 8) % 2 ? 0.25 : 1,
        }}
      />
      {label}
    </div>
  );
};

const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 2px, transparent 2px 5px)",
      pointerEvents: "none",
    }}
  />
);

export const Chrono: React.FC = () => {
  const f = useCurrentFrame();
  const bars = ease(f - B(4), 0, 6) * (1 - ease(f - B(8), 0, 6));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Prise directe jusqu'à la validation, puis arrêt sur image */}
      <Sequence durationInFrames={FOUND}>
        <Screen
          name="rapfr"
          index={REC}
          from={LIVE_FROM}
          zooms={[{ at: 0, s: 1.15, y: 0.45 }]}
        />
        <Hud label="EN DIRECT" />
      </Sequence>
      <Sequence from={FOUND} durationInFrames={B(4) - FOUND}>
        <Screen
          name="rapfr"
          index={REC}
          from={5.4}
          speed={0}
          zooms={[
            { at: 0, s: 1.15, y: 0.45 },
            { at: 2, s: 1.45, y: 0.55, d: 4 },
          ]}
        />
        <Scribble at={4} w={400} h={200} style={{ left: 340, top: 472 }} />
        <Title
          top={1250}
          size={92}
          lines={[
            ["Trouvé avant", 0],
            ["*que le chrono bouge.*", B(2) - FOUND],
          ]}
        />
      </Sequence>

      {/* Replay ralenti ×0,25 : la saisie lettre par lettre */}
      <Sequence from={B(4)} durationInFrames={B(4)}>
        <Screen
          name="rapfr"
          index={REC}
          from={4.55}
          speed={0.25}
          zooms={[
            { at: 0, s: 1.5, x: 0.3, y: 0.95 },
            { at: B(3), s: 1.5, y: 0.6, d: 6 },
          ]}
        />
        <Scanlines />
        <Hud label="REPLAY ×0,25" color={C.pink} />
      </Sequence>
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 150 * bars,
            background: "#000",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 150 * bars,
            background: "#000",
          }}
        />
      </AbsoluteFill>

      {/* Le défi */}
      <Sequence from={B(8)} durationInFrames={B(4)}>
        <AbsoluteFill style={{ filter: "blur(18px) brightness(.35)" }}>
          <Screen name="rapfr" index={REC} from={5.4} speed={0} />
        </AbsoluteFill>
        <Title
          top={600}
          size={140}
          kicker={["Défi", 0]}
          lines={[
            ["À toi.", 0],
            ["*Room Rap FR.*", B(1)],
            ["_Gratuit,_", B(2)],
            ["_sans compte._", B(3)],
          ]}
        />
      </Sequence>

      <Sequence from={B(12)}>
        <Cover beat={BEAT} kicker="Défi · rooms Rap FR" />
      </Sequence>
      <Finish cuts={[FOUND, B(4), B(8), B(12)]} />
    </AbsoluteFill>
  );
};
