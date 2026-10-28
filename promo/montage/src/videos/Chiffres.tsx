import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import beatsJson from "../../public/ref/niska.beats.json";
import { Cover } from "../zik/Cover";
import { Finish, grid } from "../zik/kit";
import { ease } from "../zik/motion";
import { C, COND } from "../zik/theme";
import { Kicker, MONO, Title } from "../zik/Title";

// « Ils jouent déjà » sur « Adriano » (Niska) : vrais chiffres de ZIK (accueil et base, 28/10/2026),
// un compteur par temps fort, façon affiche de données.
const { BEAT, B } = grid(beatsJson);
const STATS = [
  { n: 888, label: "joueurs inscrits", sub: "sans compter les invités" },
  { n: 284, label: "parties ce mois-ci", sub: "et le mois n'est pas fini" },
  { n: 658, label: "titres en Rap FR", sub: "rien que dans une room" },
  { n: 19, label: "rooms officielles", sub: "QCM ou saisie libre" },
  { n: 86, label: "Zikle déjà joués", sub: "une chanson par jour" },
];
const S0 = B(4);
const EACH = B(2);
const END = S0 + EACH * STATS.length;
export const CHIFFRES_LEN = END + B(4) + B(6);

const Stat: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const s = STATS[i];
  // Compteur qui ralentit en arrivant, comme un afficheur
  const v = Math.round(
    interpolate(f, [0, EACH * 0.8], [0, s.n], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
  );
  const leave = ease(f, EACH - 5, EACH);
  return (
    <AbsoluteFill style={{ transform: `translateX(${-leave * 1100}px)` }}>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 520,
          fontFamily: MONO,
          fontSize: 30,
          color: "#8896aa",
          letterSpacing: "0.2em",
        }}
      >
        {String(i + 1).padStart(2, "0")} /{" "}
        {String(STATS.length).padStart(2, "0")}
      </div>
      <div
        style={{
          position: "absolute",
          left: 66,
          top: 580,
          fontFamily: COND,
          fontWeight: 800,
          fontSize: 400,
          lineHeight: 0.85,
          color: i % 2 ? C.text : C.pink,
          letterSpacing: "-0.02em",
        }}
      >
        {v}
      </div>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 950,
          width: 860,
          height: 3,
          background: "rgba(255,255,255,.15)",
          transform: `scaleX(${ease(f, 2, 12)})`,
          transformOrigin: "left",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 990,
          fontFamily: COND,
          fontWeight: 800,
          fontSize: 110,
          textTransform: "uppercase",
          color: C.text,
          opacity: ease(f, 3, 9),
        }}
      >
        {s.label}
      </div>
      <Kicker
        text={s.sub}
        at={6}
        color="#8896aa"
        style={{ position: "absolute", left: 80, top: 1120 }}
      />
    </AbsoluteFill>
  );
};

export const Chiffres: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.035) 2px, transparent 2px)",
        backgroundSize: "100% 120px",
      }}
    />
    <Sequence durationInFrames={S0}>
      <Title
        top={560}
        size={170}
        kicker={["ZIK en chiffres", 0]}
        lines={[
          ["Ils jouent", 0],
          ["*déjà.*", B(1)],
          ["_Et toi ?_", B(2)],
        ]}
      />
    </Sequence>
    {STATS.map((_, i) => (
      <Sequence key={i} from={S0 + i * EACH} durationInFrames={EACH}>
        <Stat i={i} />
      </Sequence>
    ))}
    <Sequence from={END} durationInFrames={B(4)}>
      <Title
        top={600}
        size={170}
        kicker={["Gratuit · sans appli", 0]}
        lines={[
          ["Rejoins", 0],
          ["*la partie.*", B(1)],
        ]}
      />
    </Sequence>
    <Sequence from={END + B(4)}>
      <Cover beat={BEAT} />
    </Sequence>
    <Finish cuts={[S0, END]} />
  </AbsoluteFill>
);
