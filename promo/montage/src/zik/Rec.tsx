import { Img, staticFile, useCurrentFrame } from "remotion";
import { FPS } from "./theme";

export type RecIndex = { w: number; h: number; frames: [string, number][] };

// Vraie capture d'écran ZIK (scripts/capture.mjs). `from` = seconde de la capture à la frame 0, `speed` > 1 accélère.
export const Rec: React.FC<{
  name: string;
  index: RecIndex;
  from?: number;
  speed?: number;
  style?: React.CSSProperties;
}> = ({ name, index, from = 0, speed = 1, style }) => {
  const t = from + (useCurrentFrame() / FPS) * speed;
  let f = index.frames[0][0];
  for (const [file, at] of index.frames) {
    if (at > t) break;
    f = file;
  }
  return (
    <Img
      src={staticFile(`rec/${name}/${f}`)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "top",
        display: "block",
        ...style,
      }}
    />
  );
};
