import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import beatsJson from "../../public/ref/latraine.beats.json";
import { Cover } from "../zik/Cover";
import { Finish, TopShade, grid } from "../zik/kit";
import { ease } from "../zik/motion";
import { C } from "../zik/theme";
import { Title } from "../zik/Title";

// V1 « POV : t'as mis un blind test sur la TV du bar » sur « Tu danses pas tu bois pas » (La Traine, 126 BPM).
// Plan-séquence : le travelling du bar 3D (public/ref/bar-9x16.mp4, 24 s) joue d'une traite à 1,8× sur 7 mesures,
// un sous-titre par mesure, bandes cinéma qui s'ouvrent sur la dernière, puis l'outro.
const { B } = grid(beatsJson);
const BAR = B(4);
const RATE = 24 / ((7 * BAR) / 30);
export const BAR_POV_LEN = 8 * BAR + B(2);

// Décalage vertical du plan par mesure : l'écran de la TV reste sous le titre (y > 600)
const SHIFT = [300, 280, 260, 220, 260, 460, 300];

const Plan: React.FC = () => {
  const f = useCurrentFrame();
  const m = Math.min(6, Math.floor(f / BAR));
  const prev = SHIFT[Math.max(0, m - 1)];
  const y = prev + (SHIFT[m] - prev) * ease(f, m * BAR, m * BAR + 10);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ transform: `translateY(${y}px)` }}>
        <OffthreadVideo
          src={staticFile("ref/bar-9x16.mp4")}
          playbackRate={RATE}
          muted
        />
      </AbsoluteFill>
      <TopShade />
    </AbsoluteFill>
  );
};

// Bandes noires de film, fines, qui s'ouvrent sur la mesure 7
const Bands: React.FC = () => {
  const h = 110 * (1 - ease(useCurrentFrame(), 6 * BAR, 7 * BAR));
  const band = {
    position: "absolute",
    left: 0,
    right: 0,
    height: h,
    background: "#000",
  } as const;
  return (
    <>
      <div style={{ ...band, top: 0 }} />
      <div style={{ ...band, bottom: 0 }} />
    </>
  );
};

// [surtitre, texte, mesure de départ, nombre de mesures]
const LINES: [string | null, string, number, number][] = [
  ["POV", "T'as mis un *blind test* sur la TV du bar", 0, 2],
  [null, "Karim, *3,6 s.*", 2, 1],
  [null, "Zoé tape sur son *téléphone*", 3, 1],
  [null, "Toi, tu pilotes depuis la *régie*", 4, 1],
  [null, "Personne n'a regardé son *insta*", 5, 1],
  [null, "Gratuit jusqu'à *12*", 6, 1],
];

export const BarPov: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Sequence durationInFrames={7 * BAR}>
      <Plan />
      {LINES.map(([kicker, text, at, len], i) => (
        <Sequence key={i} from={at * BAR} durationInFrames={len * BAR}>
          <Title
            size={i === 0 ? 118 : 104}
            kicker={kicker ? [kicker, 0] : undefined}
            lines={[[text, i === 0 ? B(1) : 2]]}
            out={len * BAR - 5}
          />
        </Sequence>
      ))}
      <Bands />
    </Sequence>
    <Sequence from={7 * BAR}>
      <Cover
        beat={B(1)}
        kicker="Blind test sur la TV · gratuit jusqu'à 12"
        cta="zik-music.fr/salon"
      />
    </Sequence>
    <Finish cuts={Array.from({ length: 8 }, (_, i) => i * BAR)} />
  </AbsoluteFill>
);
