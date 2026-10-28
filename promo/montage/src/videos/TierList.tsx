import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import beatsJson from "../../public/ref/orelsan.beats.json";
import { Cover } from "../zik/Cover";
import { Cut } from "../zik/Cut";
import { HOME } from "../zik/elements";
import { Finish, grid } from "../zik/kit";
import { ease, slam } from "../zik/motion";
import { C, COND } from "../zik/theme";
import { Title } from "../zik/Title";

// « Tier list des rooms ZIK » sur « Boss (Remix) » (Orelsan) : les vraies rooms viennent se ranger dans S/A/B/C.
const { BEAT, B } = grid(beatsJson);
const TIERS = [
  { t: "S", c: C.pink },
  { t: "A", c: "#ff8a4d" },
  { t: "B", c: "#ffd84d" },
  { t: "C", c: "#4dc3ff" },
];
// Ordre d'arrivée : [room, rangée]
const PICKS: [string, number][] = [
  ["rapfr", 0],
  ["annees2000", 0],
  ["disney", 1],
  ["chanson", 1],
  ["annees8090", 2],
  ["rapus", 2],
  ["rock", 2],
  ["techno", 3],
];
const ROW_TOP = 560;
const ROW_H = 225;
const TILE_W = 150;
export const TIER_LIST_LEN = B(16) + B(6);

export const TierList: React.FC = () => {
  const f = useCurrentFrame();
  const slot: number[] = [0, 0, 0, 0];
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence durationInFrames={B(12)}>
        <Title
          top={200}
          size={128}
          kicker={["Tier list", 0]}
          lines={[
            ["Les rooms ZIK,", 0],
            ["*classées.*", B(1)],
          ]}
          out={B(12) - 6}
        />
      </Sequence>
      <Sequence from={B(12)} durationInFrames={B(4)}>
        <Title
          top={200}
          size={128}
          kicker={["Le débat", 0]}
          lines={[
            ["Techno en C.", 0],
            ["*On en parle ?*", B(1)],
          ]}
        />
      </Sequence>

      {TIERS.map(({ t, c }, r) => (
        <div
          key={t}
          style={{
            position: "absolute",
            left: 60,
            top: ROW_TOP + r * ROW_H,
            width: 880,
            height: ROW_H - 16,
            background: "#121217",
            border: "2px solid rgba(255,255,255,.08)",
            clipPath: `inset(0 ${(1 - ease(f, B(r * 0.5), B(r * 0.5) + 8)) * 100}% 0 0)`,
            display: "flex",
          }}
        >
          <div
            style={{
              width: 150,
              background: c,
              color: "#0a0a0a",
              display: "grid",
              placeItems: "center",
              fontFamily: COND,
              fontWeight: 800,
              fontSize: 130,
            }}
          >
            {t}
          </div>
        </div>
      ))}

      {PICKS.map(([room, r], i) => {
        const at = B(4 + i);
        const k = slot[r]++;
        return (
          <div
            key={room}
            style={{
              position: "absolute",
              left: 230 + k * (TILE_W + 18),
              top: ROW_TOP + r * ROW_H + 8,
              transform: `rotate(${(i % 3) - 1}deg)`,
            }}
          >
            <div style={slam(f, at, "up", 1400)}>
              <Cut
                rec={HOME.rec}
                frame="rooms.png"
                box={HOME.rooms[room]}
                width={TILE_W}
                radius={4}
                style={{ boxShadow: "0 12px 26px rgba(0,0,0,.6)" }}
              />
            </div>
          </div>
        );
      })}

      <Sequence from={B(16)}>
        <Cover beat={BEAT} kicker="Ton classement en com'" />
      </Sequence>
      <Finish cuts={[B(4), B(12), B(16)]} />
    </AbsoluteFill>
  );
};
