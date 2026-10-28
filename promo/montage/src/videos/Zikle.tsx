import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import beatsJson from "../../public/ref/guy2bezbar.beats.json";
import zikle from "../../public/rec/zikle/index.json";
import { Cover } from "../zik/Cover";
import { Finish, grid, TopShade } from "../zik/kit";
import { slam } from "../zik/motion";
import { Rec, RecIndex } from "../zik/Rec";
import { Screen } from "../zik/Screen";
import { C, COND } from "../zik/theme";
import { Kicker, Title } from "../zik/Title";

// Zikle, la chanson du jour, sur « Je pense à toi » (Guy2bezbar), tempo lent : vraie partie locale,
// compteur d'essais géant en surimpression. Montre la réponse du Zikle du jour de la prise : poster le lendemain au plus tôt.
const { BEAT, B } = grid(beatsJson);
const REC = zikle as unknown as RecIndex;
export const ZIKLE_LEN = B(20) + B(6);

// Compteur « n/6 » façon affiche, vert quand c'est trouvé
const Count: React.FC<{ n: number; found?: boolean }> = ({ n, found }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        right: 90,
        top: 190,
        textAlign: "right",
        ...slam(f, 0, "down", 300),
      }}
    >
      <Kicker text={found ? "Trouvé" : "Essai"} color={found ? C.ok : C.pink} />
      <div
        style={{
          fontFamily: COND,
          fontWeight: 800,
          fontSize: 230,
          lineHeight: 0.9,
          color: found ? C.ok : C.text,
        }}
      >
        {n}
        <span style={{ fontSize: 110, color: "#8896aa" }}>/6</span>
      </div>
    </div>
  );
};

export const Zikle: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    {/* Accroche sur la page floutée */}
    <Sequence durationInFrames={B(4)}>
      <AbsoluteFill
        style={{ filter: "blur(22px) brightness(.3)", transform: "scale(1.2)" }}
      >
        <Rec name="zikle" index={REC} from={1} />
      </AbsoluteFill>
      <Title
        top={520}
        size={160}
        kicker={["Zikle · la chanson du jour", 0]}
        lines={[
          ["Une chanson.", 0],
          ["*Six essais.*", B(1)],
          ["_Chaque jour._", B(2)],
        ]}
      />
    </Sequence>

    {/* Les trois essais, un par mesure */}
    {[
      { from: 3.3, n: 1 },
      { from: 7.9, n: 2 },
      { from: 13.4, n: 3 },
    ].map(({ from, n }, i) => (
      <Sequence key={n} from={B(4 + i * 4)} durationInFrames={B(4)}>
        <Screen
          name="zikle"
          index={REC}
          from={from}
          speed={1.25}
          zooms={
            n === 3
              ? [
                  { at: 0, s: 1.3, x: 0.3, y: 0.82 },
                  { at: B(2), s: 1.25, y: 0.62, d: 8 },
                ]
              : [
                  { at: 0, s: 1.3, x: 0.3, y: 0.82 },
                  { at: B(2), s: 1.4, y: 0.2, d: 8 },
                ]
          }
        />
        <TopShade />
        <Count n={n} />
      </Sequence>
    ))}

    {/* Le résultat */}
    <Sequence from={B(16)} durationInFrames={B(4)}>
      <Screen
        name="zikle"
        index={REC}
        from={17.5}
        speed={0}
        zooms={[{ at: 0, s: 1.3, y: 0.62 }]}
      />
      <TopShade />
      <Count n={3} found />
      <Title
        top={1180}
        size={120}
        lines={[
          ["Et toi ?", B(1)],
          ["*Demain, une autre.*", B(2)],
        ]}
      />
    </Sequence>

    <Sequence from={B(20)}>
      <Cover beat={BEAT} kicker="Zikle · gratuit, sans compte" />
    </Sequence>
    <Finish cuts={[B(4), B(8), B(12), B(16), B(20)]} />
  </AbsoluteFill>
);
