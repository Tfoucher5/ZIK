import { loadFont as loadEmoji } from "@remotion/google-fonts/NotoColorEmoji";
import { loadFont as loadTikTok } from "@remotion/google-fonts/TikTokSans";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import index from "../../public/rec/lot1-partie/index.json";
import indexSon from "../../public/rec/lot1-partie-son/index.json";
import { Rec, type RecIndex } from "../zik/Rec";
import { FPS } from "../zik/theme";

// Lot 1 : vraie partie en ligne (local + passerelle lecture seule), coupes sèches, bulles façon éditeur TikTok.
const { fontFamily: TT } = loadTikTok("normal", { weights: ["700"] });
const { fontFamily: EMO } = loadEmoji();

// [début, fin] en secondes de capture, bulle, score affiché (trouvés, ratés), début du son si décalé (son qui déborde sur la réponse)
type Seg = [number, number, string, string, number?];
const SEGS: Seg[] = [
  [4.7, 8.6, "7/10 sur les années 80\nvous faites mieux ?", "✅ 0  ❌ 0"],
  [46.2, 50.4, "", "✅ 1  ❌ 0"],
  [63.6, 69.8, "je connais ce son par cœur pourtant", "✅ 2  ❌ 0"],
  [86.6, 88.4, "", "✅ 2  ❌ 0"],
  [89.6, 92.4, "TINA TURNER. j'ai honte", "✅ 2  ❌ 1"],
  [101.8, 106.2, "ok celle-là trop facile", "✅ 2  ❌ 1"],
  [138.6, 142.2, "maria… maria quoi", "✅ 3  ❌ 1"],
  [165.0, 167.4, "", "✅ 3  ❌ 2"],
  [173.0, 177.2, "", "✅ 3  ❌ 2"],
  [232.8, 236.6, "", "✅ 5  ❌ 2"],
  [258.2, 261.4, "personne l'a eue. même pas eux", "✅ 5  ❌ 3"],
  [270.8, 274.4, "", "✅ 5  ❌ 3"],
  [302.8, 306.4, "", "✅ 6  ❌ 3"],
  [306.4, 310.2, "7/10. à vous 👇", "✅ 7  ❌ 3"],
];
// Version courte avec le son du jeu (retour de Théo : aucun moment plat, 15-25 s, son du début à la fin)
const SEGS_SON: Seg[] = [
  [4.3, 5.9, "7/10 sur les années 80\nvous faites mieux ?", "✅ 0  ❌ 0"],
  [59.2, 61.0, "", "✅ 2  ❌ 0"],
  [86.0, 86.7, "", "✅ 2  ❌ 0"],
  [87.2, 88.6, "", "✅ 2  ❌ 1", 84.6],
  [170.1, 171.7, "", "✅ 3  ❌ 2"],
  [172.6, 173.7, "", "✅ 3  ❌ 2"],
  [234.0, 235.5, "", "✅ 5  ❌ 2"],
  [257.9, 258.5, "", "✅ 5  ❌ 2"],
  [259.3, 260.5, "", "✅ 5  ❌ 3", 256.9],
  [271.6, 273.2, "", "✅ 5  ❌ 3"],
  [281.2, 283.5, "", "✅ 6  ❌ 3"],
  [295.0, 296.6, "7/10. à vous 👇", "✅ 7  ❌ 3", 292.4],
];
const LEN = (s: Seg) => Math.round((s[1] - s[0]) * FPS);
const total = (segs: Seg[]) => segs.reduce((n, s) => n + LEN(s), 0);
export const PARTIE_LEN = total(SEGS);
export const PARTIE_SON_LEN = total(SEGS_SON);

const K = 0.7; // capture 975×2110 → 683×1477 : la barre de saisie reste au-dessus de la légende TikTok
const bubble: React.CSSProperties = {
  background: "#fff",
  color: "#000",
  fontFamily: `${TT}, ${EMO}`,
  fontWeight: 700,
  borderRadius: 14,
  padding: "8px 20px",
  lineHeight: 1.3,
  whiteSpace: "pre-line",
  textAlign: "center",
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
};

const Sound: React.FC<{ name: string; from: number; len: number }> = ({
  name,
  from,
  len,
}) => {
  const f = useCurrentFrame();
  // 2 images de fondu aux coupes : pas de clic
  const vol = interpolate(f, [0, 2, len - 2, len], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Audio
      src={staticFile(`rec/${name}/audio.wav`)}
      startFrom={Math.round(from * FPS)}
      volume={vol}
    />
  );
};

const Shot: React.FC<{
  seg: Seg;
  name: string;
  idx: RecIndex;
  son: boolean;
}> = ({ seg, name, idx, son }) => {
  const [from, , text, score, audioFrom] = seg;
  const rec = <Rec name={name} index={idx} from={from} />;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {son && <Sound name={name} from={audioFrom ?? from} len={LEN(seg)} />}
      <AbsoluteFill
        style={{
          filter: "blur(40px) brightness(.55)",
          transform: "scale(1.15)",
        }}
      >
        {rec}
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: (1080 - 975 * K) / 2,
          top: 0,
          width: 975 * K,
          height: 2110 * K,
        }}
      >
        {rec}
      </div>
      <div
        style={{
          position: "absolute",
          top: 190,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <span
          style={{ ...bubble, fontSize: 40, background: "#000", color: "#fff" }}
        >
          {score}
        </span>
      </div>
      {text && (
        <div
          style={{
            position: "absolute",
            top: 1110,
            left: 90,
            right: 90,
            textAlign: "center",
          }}
        >
          <span style={{ ...bubble, fontSize: 58 }}>{text}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

const montage =
  (segs: Seg[], name: string, idx: RecIndex, son: boolean): React.FC =>
  () => {
    let at = 0;
    return (
      <AbsoluteFill>
        {segs.map((s) => {
          const start = at;
          at += LEN(s);
          return (
            <Sequence key={s[0]} from={start} durationInFrames={LEN(s)}>
              <Shot seg={s} name={name} idx={idx} son={son} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    );
  };

export const Partie = montage(
  SEGS,
  "lot1-partie",
  index as unknown as RecIndex,
  false,
);
export const PartieSon = montage(
  SEGS_SON,
  "lot1-partie-son",
  indexSon as unknown as RecIndex,
  true,
);
