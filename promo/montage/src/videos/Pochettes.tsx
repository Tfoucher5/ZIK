import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import beatsJson from "../../public/ref/lafouine.beats.json";
import { Cover } from "../zik/Cover";
import { Finish, grid } from "../zik/kit";
import { Kicker, Title } from "../zik/Title";
import { ease, pulse, slam } from "../zik/motion";
import { QcmButton } from "../zik/QcmButton";
import { Scribble } from "../zik/Scribble";
import { C } from "../zik/theme";

// Blind test TikTok « devine l'artiste avec la pochette floutée » sur « Tombé pour elle » : 3 manches de 2 mesures.
const { BEAT, B } = grid(beatsJson);
const ROUNDS = [
  {
    img: "stromae",
    choices: ["Stromae", "Maître Gims", "Orelsan", "Soprano"],
    good: 0,
  },
  {
    img: "angele",
    choices: ["Pomme", "Clara Luciani", "Angèle", "Louane"],
    good: 2,
  },
  {
    img: "daftpunk",
    choices: ["Justice", "David Guetta", "Bob Sinclar", "Daft Punk"],
    good: 3,
  },
];
const R0 = B(4);
const END = R0 + B(8 * ROUNDS.length);
export const POCHETTES_LEN = END + B(4) + B(6);
// Flou de la pochette à chaque temps de la manche, net sur le 7e temps (révélation)
const BLUR = [70, 50, 36, 24, 16, 10, 0, 0];

const Round: React.FC<{ n: number }> = ({ n }) => {
  const f = useCurrentFrame();
  const r = ROUNDS[n];
  const beat = Math.min(7, Math.floor(f / BEAT));
  const reveal = f >= B(6);
  const ring = 1 - ease(f, B(1), B(6));
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <Kicker
        text={`Manche ${n + 1}/3`}
        style={{
          position: "absolute",
          top: 175,
          width: "100%",
          textAlign: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 250,
          width: 600,
          height: 600,
          ...slam(f, 0, "zoom"),
        }}
      >
        <svg
          width={600}
          height={600}
          style={{
            position: "absolute",
            inset: 0,
            transform: "rotate(-90deg)",
          }}
        >
          <circle
            cx={300}
            cy={300}
            r={290}
            fill="none"
            stroke="rgba(255,255,255,.08)"
            strokeWidth={10}
          />
          <circle
            cx={300}
            cy={300}
            r={290}
            fill="none"
            stroke={reveal ? C.ok : C.pink}
            strokeWidth={10}
            strokeDasharray={1822}
            strokeDashoffset={1822 * (1 - (reveal ? 1 : ring))}
            strokeLinecap="round"
          />
        </svg>
        <Img
          src={staticFile(`pochettes/${r.img}.jpg`)}
          style={{
            position: "absolute",
            left: 50,
            top: 50,
            width: 500,
            height: 500,
            borderRadius: 18,
            objectFit: "cover",
            filter: `blur(${BLUR[beat]}px)`,
            transform: `scale(${1 + 0.04 * pulse(f, [0, B(1), B(2), B(3), B(4), B(5), B(6)], 4)})`,
            boxShadow: "0 40px 80px rgba(0,0,0,.6)",
          }}
        />
      </div>
      {r.choices.map((c, i) => (
        <div
          key={c}
          style={{
            position: "absolute",
            left: 80,
            top: 900 + i * 150,
            ...slam(f, B(2) + i * 3, i % 2 ? "right" : "left", 1100),
          }}
        >
          <QcmButton
            i={i}
            text={c}
            width={860}
            state={reveal ? (i === r.good ? "correct" : "neutral") : undefined}
          />
          {i === r.good && (
            <Scribble
              at={B(6) + 2}
              w={960}
              h={190}
              style={{ left: -30, top: -32 }}
              color="#ffe14d"
            />
          )}
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const Pochettes: React.FC = () => {
  const f = useCurrentFrame();
  const p = pulse(
    f,
    Array.from({ length: 50 }, (_, i) => B(i)),
  );
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(70% 45% at 50% 30%, rgba(255,0,255,.12), transparent 70%)",
          opacity: 0.6 + 0.4 * p,
        }}
      />
      <Sequence durationInFrames={R0}>
        <Title
          top={560}
          size={150}
          kicker={["Blind test · 3 manches", 0]}
          lines={[
            ["Devine", 0],
            ["l'artiste", B(1)],
            ["_avec juste_", B(2)],
            ["*la pochette.*", B(3)],
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
          top={620}
          size={150}
          kicker={["Ton score", 0]}
          lines={[
            ["T'as eu", 0],
            ["*combien ?*", B(1)],
            ["_Dis-le en com'._", B(2)],
          ]}
        />
      </Sequence>
      <Sequence from={END + B(4)}>
        <Cover beat={BEAT} kicker="Blind test entre potes" />
      </Sequence>
      <Finish cuts={[R0, ...ROUNDS.map((_, n) => R0 + B(8 * n + 6)), END]} />
    </AbsoluteFill>
  );
};
