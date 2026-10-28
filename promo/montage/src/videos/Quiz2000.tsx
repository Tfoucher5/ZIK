import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import beatsJson from "../../public/ref/willem.beats.json";
import { Cover } from "../zik/Cover";
import { Finish, grid } from "../zik/kit";
import { Title } from "../zik/Title";
import { ease, slam } from "../zik/motion";
import { QcmButton } from "../zik/QcmButton";
import { Scribble } from "../zik/Scribble";
import { BODY, C, COND } from "../zik/theme";

// Quiz « 3/3 = t'as grandi dans les années 2000 » sur « Double je » : style jeu télé, grille 2×2,
// barre de temps qui se vide, les mauvaises réponses tombent à la révélation.
const { BEAT, B } = grid(beatsJson);
const QS = [
  {
    q: "Qui chante « Umbrella » (2007) ?",
    c: ["Beyoncé", "Rihanna", "Shakira", "Nelly Furtado"],
    good: 1,
  },
  {
    q: "« Alors on danse » (2009), c'est…",
    c: ["Maître Gims", "Christophe Maé", "Stromae", "Grand Corps Malade"],
    good: 2,
  },
  {
    q: "Dans « Hips Don't Lie », Shakira chante avec…",
    c: ["Wyclef Jean", "Pitbull", "Sean Paul", "Akon"],
    good: 0,
  },
];
const Q0 = B(4);
const END = Q0 + B(8 * QS.length);
export const QUIZ_2000_LEN = END + B(4) + B(6);

const Question: React.FC<{ n: number }> = ({ n }) => {
  const f = useCurrentFrame();
  const q = QS[n];
  const reveal = f >= B(6);
  const left = 1 - ease(f, B(2), B(6));
  return (
    <AbsoluteFill>
      {/* Bandeau question façon jeu télé, entre en biais */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 300,
          width: 870,
          transform: `skewY(-3deg) translateX(${(1 - ease(f, 0, 8)) * -1200}px)`,
        }}
      >
        <div
          style={{
            background: "#fafafa",
            color: "#0a0a0a",
            padding: "34px 40px",
            fontFamily: COND,
            fontWeight: 800,
            fontSize: 74,
            lineHeight: 1.05,
            textTransform: "uppercase",
            boxShadow: `14px 14px 0 ${C.pink}`,
          }}
        >
          {q.q}
        </div>
      </div>
      {/* Barre de temps */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 640,
          width: 880,
          height: 22,
          background: "rgba(255,255,255,.08)",
          borderRadius: 11,
          opacity: ease(f, B(1), B(2)),
        }}
      >
        <div
          style={{
            width: `${(reveal ? 0 : left) * 100}%`,
            height: "100%",
            borderRadius: 11,
            background: left < 0.3 ? "#ef4444" : C.pink,
          }}
        />
      </div>
      {q.c.map((c, i) => {
        const fall = reveal && i !== q.good ? f - B(6) : 0;
        return (
          <div
            key={c}
            style={{
              position: "absolute",
              left: 60 + (i % 2) * 455,
              top: 720 + Math.floor(i / 2) * 330,
              transform: `translateY(${fall * fall * 3}px) rotate(${fall * (i % 2 ? 2.5 : -2.5)}deg) scale(${reveal && i === q.good ? 1 + 0.08 * ease(f, B(6), B(6) + 5) : 1})`,
              opacity: interpolate(fall, [0, 14], [1, 0], {
                extrapolateRight: "clamp",
              }),
              zIndex: i === q.good ? 2 : 1,
            }}
          >
            <div
              style={slam(f, B(1) + Math.round(i * BEAT * 0.5), "down", 700)}
            >
              <QcmButton
                i={i}
                text={c}
                width={425}
                height={290}
                state={reveal && i === q.good ? "correct" : undefined}
              />
              {reveal && i === q.good && (
                <Scribble
                  at={B(6) + 3}
                  w={480}
                  h={340}
                  style={{ left: -28, top: -26 }}
                />
              )}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Quiz2000: React.FC = () => {
  const f = useCurrentFrame();
  const score = QS.filter((_, n) => f >= Q0 + B(8 * n + 6)).length;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Rayures qui défilent : calque plus grand décalé d'une période (113 px = 80 px à 45°), sans couture */}
      <div
        style={{
          position: "absolute",
          inset: -240,
          background:
            "repeating-linear-gradient(135deg, rgba(255,0,255,.05) 0 40px, transparent 40px 80px)",
          transform: `translateX(${(f * 2) % 113.14}px)`,
        }}
      />
      <Sequence durationInFrames={Q0}>
        <Title
          top={560}
          size={150}
          kicker={["Quiz · années 2000", 0]}
          lines={[
            ["3/3 ?", 0],
            ["_T'as grandi_", B(1)],
            ["*dans les 2000s.*", B(2)],
          ]}
        />
      </Sequence>
      {QS.map((_, n) => (
        <Sequence key={n} from={Q0 + B(8 * n)} durationInFrames={B(8)}>
          <Question n={n} />
        </Sequence>
      ))}
      {f >= Q0 && f < END && (
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 170,
            display: "flex",
            gap: 16,
            alignItems: "center",
            fontFamily: BODY,
            fontWeight: 600,
            fontSize: 40,
            color: "#fafafa",
          }}
        >
          {QS.map((_, n) => (
            <span
              key={n}
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background:
                  n < score
                    ? C.ok
                    : f >= Q0 + B(8 * n)
                      ? C.pink
                      : "rgba(255,255,255,.15)",
              }}
            />
          ))}
          <span style={{ marginLeft: 12 }}>
            question {Math.min(3, Math.floor((f - Q0) / B(8)) + 1)}/3
          </span>
        </div>
      )}
      <Sequence from={END} durationInFrames={B(4)}>
        <Title
          top={620}
          size={150}
          kicker={["Ton score", 0]}
          lines={[
            ["T'as eu", 0],
            ["*3/3 ?*", B(1)],
            ["_Prouve-le._", B(2)],
          ]}
        />
      </Sequence>
      <Sequence from={END + B(4)}>
        <Cover beat={BEAT} kicker="Quiz · années 2000" />
      </Sequence>
      <Finish cuts={[Q0, ...QS.map((_, n) => Q0 + B(8 * n + 6)), END]} />
    </AbsoluteFill>
  );
};
