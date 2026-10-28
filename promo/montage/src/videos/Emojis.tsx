import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import beatsJson from "../../public/ref/discobitch.beats.json";
import { Cover } from "../zik/Cover";
import { Finish, grid } from "../zik/kit";
import { pulse, slam } from "../zik/motion";
import { QcmButton } from "../zik/QcmButton";
import { C } from "../zik/theme";
import { Kicker, Title } from "../zik/Title";

// « Devine la chanson en 3 emojis » sur « C'est beau la bourgeoisie » (Discobitch) : 3 tubes FR que tout le monde connaît.
const { BEAT, B } = grid(beatsJson);
const EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"';
const ROUNDS = [
  {
    e: ["👨", "❓", "📍"],
    c: ["Formidable", "Papaoutai", "Alors on danse", "Tous les mêmes"],
    good: 1,
    who: "Stromae · 2013",
  },
  {
    e: ["🔚", "💃", "🌙"],
    c: ["Tourner dans le vide", "S.O.S", "Dernière danse", "Mini World"],
    good: 2,
    who: "Indila · 2013",
  },
  {
    e: ["⬇️", "🌬️", "⛵"],
    c: [
      "Sous le vent",
      "Pour que tu m'aimes encore",
      "Je sais pas",
      "S'il suffisait d'aimer",
    ],
    good: 0,
    who: "Garou & Céline Dion · 2001",
  },
];
const R0 = B(4);
const END = R0 + B(8 * ROUNDS.length);
export const EMOJIS_LEN = END + B(4) + B(6);

const Round: React.FC<{ n: number }> = ({ n }) => {
  const f = useCurrentFrame();
  const r = ROUNDS[n];
  const reveal = f >= B(6);
  return (
    <AbsoluteFill>
      <Kicker
        text={`Chanson ${n + 1}/3`}
        style={{
          position: "absolute",
          top: 180,
          width: "100%",
          textAlign: "center",
        }}
      />
      {r.e.map((e, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 150 + i * 270,
            top: 300,
            transform: `rotate(${[-5, 3, -2][i]}deg)`,
          }}
        >
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: 28,
              background: "#15151b",
              border: "2px solid rgba(255,255,255,.1)",
              display: "grid",
              placeItems: "center",
              fontSize: 150,
              fontFamily: EMOJI,
              ...slam(f, B(i), "down", 700),
            }}
          >
            {e}
          </div>
        </div>
      ))}
      <Kicker
        text={reveal ? `${r.c[r.good]} — ${r.who}` : "C'est laquelle ?"}
        at={reveal ? B(6) : B(3)}
        color={reveal ? C.ok : "#8896aa"}
        style={{
          position: "absolute",
          top: 640,
          width: "100%",
          textAlign: "center",
          fontSize: 34,
        }}
      />
      {r.c.map((c, i) => (
        <div
          key={c}
          style={{
            position: "absolute",
            left: 80,
            top: 740 + i * 150,
            ...slam(f, B(3) + i * 3, i % 2 ? "right" : "left", 1100),
          }}
        >
          <QcmButton
            i={i}
            text={c}
            width={860}
            height={124}
            state={reveal ? (i === r.good ? "correct" : "neutral") : undefined}
          />
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const Emojis: React.FC = () => {
  const f = useCurrentFrame();
  const p = pulse(
    f,
    Array.from({ length: 60 }, (_, i) => B(i)),
  );
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(70% 40% at 50% 25%, rgba(255,0,255,.1), transparent 70%)",
          opacity: 0.6 + 0.4 * p,
        }}
      />
      <Sequence durationInFrames={R0}>
        <Title
          top={560}
          size={150}
          kicker={["Quiz · chanson française", 0]}
          lines={[
            ["Devine", 0],
            ["*la chanson*", B(1)],
            ["_en 3 emojis._", B(2)],
          ]}
        />
      </Sequence>
      {ROUNDS.map((_, n) => (
        <Sequence key={n} from={R0 + B(8 * n)} durationInFrames={B(8)}>
          <Round n={n} />
        </Sequence>
      ))}
      <Sequence from={END} durationInFrames={B(4)}>
        <Title
          top={600}
          size={150}
          kicker={["En commentaire", 0]}
          lines={[
            ["À toi :", 0],
            ["*fais-nous*", B(1)],
            ["_deviner._", B(2)],
          ]}
        />
      </Sequence>
      <Sequence from={END + B(4)}>
        <Cover beat={BEAT} kicker="Blind test · chanson française" />
      </Sequence>
      <Finish cuts={[R0, ...ROUNDS.map((_, n) => R0 + B(8 * n + 6)), END]} />
    </AbsoluteFill>
  );
};
