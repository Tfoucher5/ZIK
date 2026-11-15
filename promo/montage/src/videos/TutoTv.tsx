import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import beatsJson from "../../public/ref/mistral.beats.json";
import creationJson from "../../public/rec/salon-libre-creation/index.json";
import karimJson from "../../public/rec/salon-libre-karim/index.json";
import tvJson from "../../public/rec/salon-libre-tv/index.json";
import { Cover } from "../zik/Cover";
import { Finish, TopShade, grid } from "../zik/kit";
import { ease, slam } from "../zik/motion";
import { Rec, RecIndex } from "../zik/Rec";
import { C, COND, FPS, SAFE } from "../zik/theme";
import { Title } from "../zik/Title";

// V2 « Un blind test sur ta TV en 2 minutes » sur « Mistral » (Soso Maness, 90 BPM).
// Tuto en 3 cases numérotées : le chiffre en contour se remplit de rose à son étape et le vrai écran
// (salon filmé sur le staging par scripts/salon.mjs) glisse dans le cadre. Repères tirés des marks des captures.
const { B } = grid(beatsJson);
type Idx = RecIndex & { marks: Record<string, number> };
const CREATION = creationJson as unknown as Idx;
const TV = tvJson as unknown as Idx;
const KARIM = karimJson as unknown as Idx;
const T = TV.marks;
const K = KARIM.marks;

// Découpage en temps : accroche 4, étape 1 6, étape 2 6, étape 3 4, preuve 4, outro 6
const S1 = B(4);
const S2 = B(10);
const S3 = B(16);
const PROOF = B(20);
const OUTRO = B(24);
export const TUTO_TV_LEN = B(30);

// Capture recadrée : zone (x, y, w, h) de la capture, affichée sur `width` px
const Crop: React.FC<{
  name: string;
  index: RecIndex;
  from: number;
  speed?: number;
  zone: [number, number, number, number];
  width: number;
}> = ({ name, index, from, speed, zone: [x, y, w, h], width }) => {
  const k = width / w;
  return (
    <div
      style={{
        width,
        height: h * k,
        overflow: "hidden",
        position: "relative",
        border: "3px solid #fafafa",
        boxShadow: "14px 14px 0 #ff00ff",
        background: C.bg,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -x * k,
          top: -y * k,
          width: index.w * k,
          height: index.h * k,
        }}
      >
        <Rec name={name} index={index} from={from} speed={speed} />
      </div>
    </div>
  );
};

// Le vrai écran glisse dans la case depuis la droite, à `at`
const Slot: React.FC<{
  at?: number;
  top: number;
  children: React.ReactNode;
}> = ({ at = 0, top, children }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        ...slam(f, at, "right", 700),
      }}
    >
      {children}
    </div>
  );
};

// Les 3 cases du tuto : chiffre en contour, rempli de rose à partir de son étape
const Steps: React.FC = () => {
  const f = useCurrentFrame();
  const starts = [S1, S2, S3];
  return (
    <div
      style={{
        position: "absolute",
        top: 200,
        left: SAFE.x + 10,
        display: "flex",
        gap: 24,
        opacity: ease(f, S1 - 8, S1),
      }}
    >
      {starts.map((at, i) => {
        const fill = ease(f, at, at + 8);
        const active = f >= at && (i === 2 || f < starts[i + 1]);
        return (
          <div
            key={i}
            style={{
              width: 130,
              height: 130,
              border: `3px solid ${active ? C.pink : "#fafafa"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: COND,
              fontWeight: 800,
              fontSize: 120,
              lineHeight: 1,
              paddingTop: 10,
              color: fill > 0.5 ? C.pink : "transparent",
              WebkitTextStroke: `3px ${fill > 0 ? C.pink : "#fafafa"}`,
              transform: `scale(${1 + 0.15 * (1 - fill) * (fill > 0 ? 1 : 0)})`,
            }}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
};

const Hook: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ transform: "translateY(260px)" }}>
      <OffthreadVideo
        src={staticFile("ref/bar-9x16.mp4")}
        startFrom={6 * FPS}
        muted
      />
    </AbsoluteFill>
    <TopShade />
  </AbsoluteFill>
);

const sp = (seconds: number, frames: number) => (seconds * FPS) / frames;

type Shot = { from: number; speed?: number };
const TvShot: React.FC<Shot & { zone?: [number, number, number, number] }> = ({
  zone = [40, 280, 1520, 520],
  ...p
}) => (
  <Slot top={720}>
    <Crop name="salon-libre-tv" index={TV} zone={zone} width={960} {...p} />
  </Slot>
);
const Phone: React.FC<Shot> = (p) => (
  <Slot top={620}>
    <Crop
      name="salon-libre-karim"
      index={KARIM}
      zone={[0, 0, KARIM.w, KARIM.w * 2.05]}
      width={420}
      {...p}
    />
  </Slot>
);

export const TutoTv: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Sequence durationInFrames={S1}>
      <Hook />
      <Title
        kicker={["Tuto · ZIK Soirée", 0]}
        size={128}
        lines={[
          ["Un blind test", 2],
          ["sur *ta TV.*", B(1)],
          ["_En 2 minutes._", B(2)],
        ]}
      />
    </Sequence>

    {/* Étape 1 : la TV ouvre /salon, choisit Années 2000, puis affiche le QR et le code */}
    <Sequence from={S1} durationInFrames={S2 - S1}>
      <Title
        top={380}
        size={84}
        lines={[
          ["Ouvre", 4],
          ["*zik-music.fr/salon*", B(0.5)],
          ["sur la TV", B(1)],
        ]}
      />
      <Sequence durationInFrames={B(3)}>
        <Slot top={640}>
          <Crop
            name="salon-libre-creation"
            index={CREATION}
            from={0.3}
            speed={sp(4.8, B(3))}
            zone={[440, 0, 1040, 1080]}
            width={800}
          />
        </Slot>
      </Sequence>
      <Sequence from={B(3)} durationInFrames={B(3)}>
        <TvShot from={0.5} />
      </Sequence>
    </Sequence>

    {/* Étape 2 : Karim scanne le QR de la TV, le code se remplit, il tape son pseudo */}
    <Sequence from={S2} durationInFrames={S3 - S2}>
      <Title
        top={380}
        size={92}
        lines={[
          ["Tout le monde *scanne.*", 4],
          ["Pas d'appli.", B(0.5)],
        ]}
      />
      <Phone from={K["arrive-karim"] - 5.2} speed={sp(6, B(6))} />
    </Sequence>

    {/* Étape 3 : la liste se remplit, la régie lance, décompte sur la TV */}
    <Sequence from={S3} durationInFrames={PROOF - S3}>
      <Title top={380} size={120} lines={[["*Lance.*", 4]]} />
      <Sequence durationInFrames={B(2)}>
        <TvShot
          from={T["arrive-karim"] - 0.3}
          speed={sp(T["arrive-hugo"] + 0.6 - T["arrive-karim"], B(2))}
          zone={[40, 300, 1100, 480]}
        />
      </Sequence>
      <Sequence from={B(2)} durationInFrames={B(2)}>
        <TvShot from={T.lance + 2} />
      </Sequence>
    </Sequence>

    {/* Preuve : Karim trouve, la TV et son téléphone le montrent */}
    <Sequence from={PROOF} durationInFrames={OUTRO - PROOF}>
      <Title
        top={380}
        size={92}
        lines={[
          ["ZIK compte", 4],
          ["les *points.*", B(0.5)],
        ]}
      />
      <Sequence durationInFrames={B(2)}>
        <TvShot from={T["trouve1-karim"] - 0.4} zone={[440, 300, 700, 500]} />
      </Sequence>
      <Sequence from={B(2)} durationInFrames={B(2)}>
        <Phone from={K["trouve1-karim"] + 0.3} />
      </Sequence>
    </Sequence>

    <Sequence durationInFrames={OUTRO}>
      <Steps />
    </Sequence>
    <Sequence from={OUTRO}>
      <Cover
        beat={B(1)}
        kicker="Blind test sur ta TV · sans appli"
        cta="zik-music.fr/salon"
      />
    </Sequence>
    <Finish
      cuts={[S1, S1 + B(3), S2, S3, S3 + B(2), PROOF, PROOF + B(2), OUTRO]}
    />
  </AbsoluteFill>
);
