import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cut } from "./Cut";
import { QCM } from "./elements";
import { ease } from "./motion";
import { C, COND } from "./theme";
import { Cta, Kicker, Title } from "./Title";

// Outro-couverture reprise de l'accueil du site : logo, surtitre, « T'AS / L'OREILLE ? / PROUVE-LE. », bouton.
// La dernière image sert de couverture TikTok. `beat` = durée d'un temps en frames ; `kicker` adapte l'accroche.
export const Cover: React.FC<{ beat: number; kicker?: string }> = ({
  beat,
  kicker = "Blind test gratuit · sans appli",
}) => {
  const f = useCurrentFrame();
  const b = (i: number) => Math.round(i * beat);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      {/* Le disque du jeu, coupé par le bord comme une photo d'affiche */}
      <div
        style={{
          position: "absolute",
          right: -330,
          top: 980,
          opacity: 0.9 * ease(f, 0, b(2)),
        }}
      >
        <div style={{ transform: `rotate(${f * 1.6}deg)` }}>
          <Cut
            rec={QCM.rec}
            frame={QCM.after}
            box={QCM.vinyl}
            width={760}
            radius={380}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 190,
          fontFamily: COND,
          fontWeight: 800,
          fontSize: 64,
          color: C.text,
          opacity: ease(f, 0, 6),
        }}
      >
        ZIK<span style={{ color: C.pink }}>.</span>
      </div>
      <Title
        top={420}
        size={190}
        kicker={[kicker, 0]}
        lines={[
          ["T'as", b(0.5)],
          ["_l'oreille ?_", b(1)],
          ["*Prouve-le.*", b(2)],
        ]}
      />
      <div style={{ position: "absolute", left: 80, top: 1130 }}>
        <Cta text="zik-music.fr" at={b(3)} />
      </div>
      <Kicker
        text="En soirée sur la TV · ou en ligne"
        at={b(3.5)}
        color="#8896aa"
        style={{ position: "absolute", left: 80, top: 1290, fontSize: 26 }}
      />
    </AbsoluteFill>
  );
};
