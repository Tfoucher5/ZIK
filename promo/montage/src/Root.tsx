import { Composition } from "remotion";
import { Chiffres, CHIFFRES_LEN } from "./videos/Chiffres";
import { Chrono, CHRONO_LEN } from "./videos/Chrono";
import { Classement, CLASSEMENT_LEN } from "./videos/Classement";
import { Emojis, EMOJIS_LEN } from "./videos/Emojis";
import { NouveauSite, NOUVEAU_SITE_LEN } from "./videos/NouveauSite";
import { Pochettes, POCHETTES_LEN } from "./videos/Pochettes";
import { Presentation, PRESENTATION_LEN } from "./videos/Presentation";
import { Quiz2000, QUIZ_2000_LEN } from "./videos/Quiz2000";
import { TierList, TIER_LIST_LEN } from "./videos/TierList";
import { Zikle, ZIKLE_LEN } from "./videos/Zikle";
import { FPS, H, W } from "./zik/theme";

// Vidéos sans son (à poster) ; l'aperçu privé avec l'extrait se fait après coup avec scripts/apercu.mjs
const VIDEOS: [string, React.FC, number][] = [
  ["presentation", Presentation, PRESENTATION_LEN],
  ["nouveau-site", NouveauSite, NOUVEAU_SITE_LEN],
  ["pochettes", Pochettes, POCHETTES_LEN],
  ["quiz-2000", Quiz2000, QUIZ_2000_LEN],
  ["chrono", Chrono, CHRONO_LEN],
  ["emojis", Emojis, EMOJIS_LEN],
  ["tier-list", TierList, TIER_LIST_LEN],
  ["zikle", Zikle, ZIKLE_LEN],
  ["chiffres", Chiffres, CHIFFRES_LEN],
  ["classement", Classement, CLASSEMENT_LEN],
];

export const RemotionRoot: React.FC = () => (
  <>
    {VIDEOS.map(([id, component, len]) => (
      <Composition
        key={id}
        id={id}
        component={component}
        durationInFrames={len}
        fps={FPS}
        width={W}
        height={H}
      />
    ))}
  </>
);
