import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import beatsJson from "../../public/ref/bilouki.beats.json";
import accueil from "../../public/rec/accueil/index.json";
import { Cover } from "../zik/Cover";
import { Cut } from "../zik/Cut";
import { HOME } from "../zik/elements";
import { Finish, grid } from "../zik/kit";
import { ease, pulse, slam } from "../zik/motion";
import { Rec, RecIndex } from "../zik/Rec";
import { Scribble } from "../zik/Scribble";
import { C } from "../zik/theme";
import { Title } from "../zik/Title";

// « On a refait le site » sur « Tchébé 2x » (Bilouki). Mise en page fixe : titre en haut (200-600),
// vraie section du nouvel accueil en dessous (620-1480), jamais l'un sur l'autre.
const { BEAT, B } = grid(beatsJson);
export const NOUVEAU_SITE_LEN = B(20) + B(6);
const R = HOME.rec;
// Rotation façon polaroïd posé à la main
const TILT = [-6, 5, -3, 7];

export const NouveauSite: React.FC = () => {
  const f = useCurrentFrame();
  const p = pulse(
    f,
    Array.from({ length: 30 }, (_, i) => B(i)),
  );
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          filter: "blur(30px) brightness(.22) saturate(1.3)",
          transform: `scale(${1.3 + 0.03 * p})`,
        }}
      >
        <Rec
          name={R}
          index={accueil as unknown as RecIndex}
          from={2}
          speed={0.8}
        />
      </AbsoluteFill>

      {/* Mesure 1 : l'annonce, puis la nouvelle accroche du site bascule depuis le fond */}
      <Sequence durationInFrames={B(4)}>
        <Title
          top={200}
          size={128}
          kicker={["Mise à jour · zik-music.fr", 0]}
          lines={[
            ["On a refait", 0],
            ["*tout le site.*", B(1)],
          ]}
        />
        <AbsoluteFill style={{ perspective: 1400 }}>
          <div
            style={{
              position: "absolute",
              left: 100,
              top: 680,
              transform: `rotateX(${(1 - ease(f, B(2), B(3))) * 70}deg) scale(${0.75 + 0.25 * ease(f, B(2), B(3))})`,
              opacity: ease(f, B(2), B(2) + 6),
              boxShadow: "0 40px 90px rgba(0,0,0,.6)",
            }}
          >
            <Cut
              rec={R}
              frame={HOME.headline.frame}
              box={HOME.headline.box}
              width={880}
              radius={8}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Mesure 2 : deux portes d'entrée claires */}
      <Sequence from={B(4)} durationInFrames={B(4)}>
        <Title
          top={200}
          size={128}
          lines={[
            ["Plus clair.", 0],
            ["_Plus rapide._", B(1)],
          ]}
        />
        <div
          style={{
            position: "absolute",
            left: 160,
            top: 760,
            ...slam(f - B(4), B(1), "up", 600),
          }}
        >
          <Cut
            rec={R}
            frame={HOME.ctas.frame}
            box={HOME.ctas.box}
            width={760}
          />
          <Scribble at={B(2)} w={700} h={160} style={{ left: -10, top: -28 }} />
        </div>
      </Sequence>

      {/* Mesure 3 : les rooms tombent comme des polaroïds */}
      <Sequence from={B(8)} durationInFrames={B(4)}>
        <Title
          top={200}
          size={128}
          lines={[
            ["Choisis", 0],
            ["*ta room.*", B(1)],
          ]}
        />
        {HOME.tiles.slice(0, 4).map((t, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: [110, 560, 140, 540][i],
              top: [620, 600, 1000, 980][i],
              transform: `rotate(${TILT[i]}deg)`,
              filter: "drop-shadow(0 30px 40px rgba(0,0,0,.6))",
            }}
          >
            <div style={slam(f - B(8), B(i), "up", 1500)}>
              <Cut rec={R} frame={t.frame} box={t.box} width={380} radius={6} />
            </div>
          </div>
        ))}
      </Sequence>

      {/* Mesure 4 : le mode Salon se retourne */}
      <Sequence from={B(12)} durationInFrames={B(4)}>
        <Title
          top={200}
          size={128}
          lines={[
            ["En soirée,", 0],
            ["*sans appli.*", B(1)],
          ]}
        />
        <AbsoluteFill style={{ perspective: 1600 }}>
          <div
            style={{
              position: "absolute",
              left: 220,
              top: 620,
              transform: `rotateY(${(1 - ease(f - B(12), 0, 10)) * -120}deg)`,
            }}
          >
            <Cut
              rec={R}
              frame={HOME.salon.frame}
              box={HOME.salon.box}
              width={640}
              radius={8}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Mesure 5 : deux fonctionnalités collées comme des stickers */}
      <Sequence from={B(16)} durationInFrames={B(4)}>
        <Title
          top={200}
          size={128}
          lines={[
            ["Tout ZIK", 0],
            ["*en un coup d'œil.*", B(1)],
          ]}
        />
        {HOME.features.slice(0, 2).map((t, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: [90, 550][i],
              top: [660, 700][i],
              transform: `rotate(${[-3, 4][i]}deg)`,
            }}
          >
            <div style={slam(f - B(16), B(1 + i), "zoom")}>
              <Cut
                rec={R}
                frame={t.frame}
                box={t.box}
                width={430}
                radius={12}
                style={{ boxShadow: "0 20px 50px rgba(0,0,0,.6)" }}
              />
            </div>
          </div>
        ))}
      </Sequence>

      <Sequence from={B(20)}>
        <Cover beat={BEAT} kicker="Nouveau site · même oreille" />
      </Sequence>
      <Finish cuts={[B(4), B(8), B(12), B(16), B(20)]} />
    </AbsoluteFill>
  );
};
