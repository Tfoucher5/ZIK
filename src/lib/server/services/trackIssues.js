import { getAdminClient } from "../config.js";

// Ajoute un problème à la file « Réparer » de l'admin. Jamais bloquant : une
// partie ne doit pas s'arrêter parce que l'enregistrement a échoué.
export function reportTrackIssue(
  trackId,
  kind,
  source,
  note = null,
  context = {},
) {
  if (!trackId) return;
  try {
    getAdminClient()
      .rpc("report_track_issue", {
        p_track: trackId,
        p_kind: kind,
        p_source: source,
        p_note: note,
        p_context: context,
      })
      .then(({ error }) => {
        if (error) console.error("[track_issues]", error.message);
      });
  } catch (err) {
    console.error("[track_issues]", err.message);
  }
}

const SETTINGS_TTL = 60_000;
let _videoSettings = { value: null, at: 0 };

export const DEFAULT_VIDEO_SETTINGS = {
  exclude: ["live", "cover", "karaoke", "karaoké", "remix", "lyrics", "8d"],
  minStart: 15,
};

// Réglages de la recherche des vidéos de salon (admin › Réglages)
export async function getVideoSettings() {
  if (Date.now() - _videoSettings.at < SETTINGS_TTL)
    return _videoSettings.value;
  let value = DEFAULT_VIDEO_SETTINGS;
  try {
    const { data } = await getAdminClient()
      .from("site_settings")
      .select("value")
      .eq("key", "video_search")
      .maybeSingle();
    if (data?.value) value = { ...DEFAULT_VIDEO_SETTINGS, ...data.value };
  } catch {
    // table absente : réglages par défaut
  }
  _videoSettings = { value, at: Date.now() };
  return value;
}

export function clearVideoSettingsCache() {
  _videoSettings = { value: null, at: 0 };
}

// Écarte les vidéos dont le titre contient un mot exclu. Si tout est écarté,
// on garde la liste entière : mieux vaut une reprise qu'une manche sans son.
export function filterVideos(videos, exclude) {
  const patterns = exclude
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
    .map(
      (w) =>
        new RegExp(
          `(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`,
          "u",
        ),
    );
  const kept = videos.filter((v) => {
    const t = (v.title ?? "").toLowerCase();
    return !patterns.some((re) => re.test(t));
  });
  return kept.length ? kept : videos;
}

// Moment de départ d'une manche : celui choisi par l'admin s'il existe, sinon
// au hasard entre le départ minimum et la fin de la vidéo.
export function pickStart({ pinned, durationSec, roundDuration, minStart }) {
  if (Number.isInteger(pinned)) return pinned;
  const max = Math.max(0, durationSec - roundDuration - 10);
  if (max <= minStart) return Math.min(minStart, max);
  return minStart + Math.floor(Math.random() * (max - minStart));
}
