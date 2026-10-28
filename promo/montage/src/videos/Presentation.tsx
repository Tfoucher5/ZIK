import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import beatsJson from "../../public/ref/ronisia.beats.json";
import qcm from "../../public/rec/qcm-2000/index.json";
import rapfr from "../../public/rec/rapfr/index.json";
import { Cover } from "../zik/Cover";
import { Cut } from "../zik/Cut";
import { QCM, REVEAL } from "../zik/elements";
import { Finish, grid, TopShade } from "../zik/kit";
import { ease, glitch, out, pulse, slam } from "../zik/motion";
import { Rec, RecIndex } from "../zik/Rec";
import { Screen } from "../zik/Screen";
import { Scribble } from "../zik/Scribble";
import { C, COND } from "../zik/theme";
import { Title } from "../zik/Title";

// Présentation de l'appli sur « Cuenta » (Ronisia) : vrais éléments de ZIK qui arrivent sur chaque temps.
const { BEAT, B } = grid(beatsJson);
export const PRESENTATION_LEN = B(20) + B(6);
const Q = QCM.rec;

export const Presentation: React.FC = () => {
  const f = useCurrentFrame();
  const p = pulse(
    f,
    Array.from({ length: 30 }, (_, i) => B(i)),
  );
  const rgb = glitch(f, B(8)) + glitch(f, B(12)) + glitch(f, B(16));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          filter: "blur(28px) brightness(.24) saturate(1.3)",
          transform: `scale(${1.25 + 0.02 * p})`,
        }}
      >
        <Rec name={Q} index={qcm as unknown as RecIndex} from={16} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${1 + 0.012 * p})`,
          filter: rgb
            ? `drop-shadow(${rgb}px 0 0 rgba(255,0,80,.6)) drop-shadow(${-rgb}px 0 0 rgba(0,220,255,.6))`
            : "none",
        }}
      >
        {/* Mesure 1 : l'accroche, le disque du jeu qui tourne */}
        <Sequence durationInFrames={B(4)}>
          <div
            style={{
              position: "absolute",
              left: 220,
              top: 820,
              ...slam(f, 0, "zoom"),
            }}
          >
            <div
              style={{
                transform: `rotate(${f * 3}deg) scale(${1 + 0.04 * p})`,
              }}
            >
              <Cut
                rec={Q}
                frame={QCM.after}
                box={QCM.vinyl}
                width={640}
                radius={320}
              />
            </div>
          </div>
          <Title
            top={200}
            size={128}
            kicker={["Blind test · en soirée ou en ligne", 0]}
            lines={[
              ["Le blind test", B(0)],
              ["qu'on lance", B(1)],
              ["_à chaque_", B(2)],
              ["*soirée.*", B(3)],
            ]}
          />
        </Sequence>

        {/* Mesure 2 : les 4 vraies réponses arrivent une par une */}
        <Sequence from={B(4)} durationInFrames={B(4)}>
          {QCM.buttons.map((box, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 60,
                top: 640 + i * 190,
                ...slam(f - B(4), B(i), i % 2 ? "right" : "left", 1200),
              }}
            >
              <Cut
                rec={Q}
                frame={QCM.before}
                box={box}
                width={960}
                radius={10}
              />
            </div>
          ))}
          <Title
            top={230}
            size={128}
            lines={[
              ["4 choix.", 0],
              ["*30 secondes.*", B(2)],
            ]}
          />
        </Sequence>

        {/* Mesure 3 : la bonne réponse, le score entouré à la main */}
        <Sequence from={B(8)} durationInFrames={B(4)}>
          <div
            style={{
              position: "absolute",
              top: 620,
              left: 60,
              transform: `scale(${1 + 0.1 * ease(f - B(8), 0, 6)})`,
              opacity: out(f - B(8), B(3) + 6),
            }}
          >
            <Cut
              rec={Q}
              frame={QCM.after}
              box={QCM.buttons[2]}
              width={960}
              radius={10}
            />
          </div>
          <div
            style={{
              position: "absolute",
              top: 880,
              left: 90,
              ...slam(f - B(8), B(1), "zoom"),
            }}
          >
            <Cut rec={Q} frame={QCM.after} box={QCM.feedback} width={900} />
            <Scribble
              at={B(2)}
              w={980}
              h={200}
              style={{ left: -40, top: -50 }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: 90,
              top: 1110,
              fontFamily: COND,
              fontWeight: 800,
              fontSize: 150,
              color: C.ok,
              ...slam(f - B(8), B(2), "up", 400),
            }}
          >
            +913 PTS
          </div>
          <Title
            top={230}
            size={128}
            lines={[
              ["Le plus rapide", 0],
              ["*gagne.*", B(1)],
            ]}
          />
        </Sequence>

        {/* Mesure 4 : la vraie partie en saisie libre */}
        <Sequence from={B(12)} durationInFrames={B(4)}>
          <AbsoluteFill style={slam(f - B(12), 0, "right", 1100)}>
            <Screen
              name="rapfr"
              index={rapfr as unknown as RecIndex}
              from={4.6}
              speed={1.4}
              zooms={[
                { at: 0, s: 1.2, y: 0.55 },
                { at: B(2), s: 1.45, y: 0.6, d: 4 },
              ]}
            />
          </AbsoluteFill>
          <TopShade />
          <Title
            top={200}
            size={120}
            kicker={["Mode expert", 0]}
            lines={[
              ["Ou tape", 0],
              ["_la réponse._", B(1)],
            ]}
          />
        </Sequence>

        {/* Mesure 5 : la carte gagnée se retourne */}
        <Sequence from={B(16)} durationInFrames={B(4)}>
          <div
            style={{
              position: "absolute",
              left: 240,
              top: 560,
              opacity: 0.9,
              ...slam(f - B(16), B(1), "up", 500),
            }}
          >
            <Cut
              rec={REVEAL.rec}
              frame={REVEAL.frame}
              box={REVEAL.album}
              width={600}
              radius={14}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: 70,
              top: 930,
              perspective: 1600,
            }}
          >
            <div
              style={{
                transform: `rotateY(${(1 - ease(f - B(16), 0, 12)) * 180}deg)`,
                backfaceVisibility: "hidden",
                boxShadow: "0 40px 90px rgba(0,0,0,.7)",
                borderRadius: 26,
              }}
            >
              <Cut
                rec={REVEAL.rec}
                frame={REVEAL.frame}
                box={REVEAL.card}
                width={940}
                radius={26}
              />
            </div>
          </div>
          <Title
            top={200}
            size={128}
            lines={[
              ["Et gagne", B(1)],
              ["*des cartes.*", B(2)],
            ]}
          />
        </Sequence>
      </AbsoluteFill>

      <Sequence from={B(20)}>
        <Cover beat={BEAT} />
      </Sequence>
      <Finish cuts={[B(4), B(8), B(12), B(16), B(20)]} />
    </AbsoluteFill>
  );
};
