import { loadFont as loadEmoji } from "@remotion/google-fonts/NotoColorEmoji";
import { loadFont as loadTikTok } from "@remotion/google-fonts/TikTokSans";
import { AbsoluteFill, Sequence } from "remotion";
import index from "../../public/rec/lot1-partie/index.json";
import { Rec, type RecIndex } from "../zik/Rec";
import { FPS } from "../zik/theme";

// Lot 1 : vraie partie en ligne (local + passerelle lecture seule), coupes sèches, bulles façon éditeur TikTok.
const { fontFamily: TT } = loadTikTok("normal", { weights: ["700"] });
const { fontFamily: EMO } = loadEmoji();

// [début, fin] en secondes de capture, bulle, score affiché (trouvés, ratés)
const SEGS: [number, number, string, string][] = [
  [4.3, 8.6, "7/10 sur les années 80\nvous faites mieux ?", "✅ 0  ❌ 0"],
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
const LEN = (s: (typeof SEGS)[number]) => Math.round((s[1] - s[0]) * FPS);
export const PARTIE_LEN = SEGS.reduce((n, s) => n + LEN(s), 0);

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

const Shot: React.FC<{ seg: (typeof SEGS)[number] }> = ({ seg }) => {
  const [from, , text, score] = seg;
  const rec = (
    <Rec name="lot1-partie" index={index as unknown as RecIndex} from={from} />
  );
  return (
    <AbsoluteFill style={{ background: "#000" }}>
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

export const Partie: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill>
      {SEGS.map((s) => {
        const start = at;
        at += LEN(s);
        return (
          <Sequence key={s[0]} from={start} durationInFrames={LEN(s)}>
            <Shot seg={s} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
