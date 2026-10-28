import { Img, staticFile } from "remotion";

export type Box = { x: number; y: number; w: number; h: number };

// Vrai élément de ZIK découpé dans une image de capture (coordonnées en pixels de la capture 1075×2330)
export const Cut: React.FC<{
  rec: string;
  frame: string;
  box: Box;
  width: number;
  radius?: number;
  style?: React.CSSProperties;
}> = ({ rec, frame, box, width, radius = 0, style }) => {
  const k = width / box.w;
  return (
    <div
      style={{
        width,
        height: box.h * k,
        overflow: "hidden",
        borderRadius: radius,
        position: "relative",
        ...style,
      }}
    >
      <Img
        src={staticFile(`rec/${rec}/${frame}`)}
        style={{
          position: "absolute",
          left: -box.x * k,
          top: -box.y * k,
          width: 1075 * k,
          maxWidth: "none",
        }}
      />
    </div>
  );
};
