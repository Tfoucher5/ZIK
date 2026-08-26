import { error, json } from "@sveltejs/kit";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import { YTDLP_BIN, getYtAudioUrl } from "$lib/server/ytdlAudio.js";
import {
  validPreviewUrl,
  getDeezerPreview,
  getItunesPreview,
  ytsSearch,
} from "$lib/server/socket/game/audio.js";

const execFileAsync = promisify(execFile);

async function checkAdmin(token) {
  if (!token) throw error(403, "Token manquant");
  const user = await verifyToken(token);
  if (!user) throw error(403, "Token invalide");
  const { data: profile } = await getAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") throw error(403, "Accès refusé");
}

const step = (ok, detail, err = null) => ({ ok, detail, error: err });

// Le jeu ne garde qu'un résultat de `ytsearch5` — celui d'une chaîne « - Topic »
// s'il y en a une. On expose les cinq pour vérifier que le bon a été retenu.
async function candidatsYoutube(artist, title) {
  try {
    const { stdout } = await execFileAsync(
      YTDLP_BIN,
      [
        `ytsearch5:${artist} - ${title}`,
        "--flat-playlist",
        "-j",
        "--no-warnings",
        "--socket-timeout",
        "8",
      ],
      { timeout: 12000, maxBuffer: 2 * 1024 * 1024 },
    );
    const lignes = stdout
      .trim()
      .split("\n")
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const estTopic = (v) =>
      Boolean(
        v.channel?.endsWith("- Topic") || v.uploader?.endsWith("- Topic"),
      );
    const retenu = lignes.find(estTopic) ?? lignes[0];

    return lignes.map((v) => ({
      id: v.id,
      titre: v.title ?? "",
      chaine: v.channel || v.uploader || "",
      duree: v.duration ?? null,
      topic: estTopic(v),
      retenu: v.id === retenu?.id,
    }));
  } catch {
    return [];
  }
}

// Rejoue la chaîne audio d'un titre sans jamais écrire en base.
export async function POST({ url, request }) {
  await checkAdmin(url.searchParams.get("token"));

  const { trackId, overrideExternalId, overridePreviewUrl } =
    await request.json();
  if (!trackId) return json({ error: "trackId requis" }, { status: 400 });

  const { data: track } = await getAdminClient()
    .from("tracks")
    .select(
      "id, artist, title, preview_url, preview_expires_at, external_id, source",
    )
    .eq("id", trackId)
    .single();
  if (!track) return json({ error: "Titre introuvable" }, { status: 404 });

  const previewUrl = overridePreviewUrl || track.preview_url;
  const externalId = overrideExternalId || track.external_id;
  const steps = {};

  const stillValid = validPreviewUrl(previewUrl);
  steps.catalogue = step(
    Boolean(stillValid),
    previewUrl
      ? `preview_url présente, expire_at=${track.preview_expires_at ?? "—"}, external_id=${externalId ?? "—"}, source=${track.source ?? "—"}`
      : `aucune preview_url, external_id=${externalId ?? "—"}, source=${track.source ?? "—"}`,
    previewUrl && !stillValid ? "preview_url expirée" : null,
  );

  let version;
  try {
    const { stdout } = await execFileAsync(YTDLP_BIN, ["--version"]);
    version = stdout.trim();
  } catch (e) {
    version = `indisponible (${e.message})`;
  }

  // getYtAudioUrl attend un identifiant de vidéo : on passe d'abord par
  // ytsSearch, exactement comme le fait le jeu.
  const video = await ytsSearch(track.artist, track.title).catch(() => null);
  const candidats = await candidatsYoutube(track.artist, track.title);
  steps.recherche = step(
    Boolean(video?.id),
    video?.id
      ? `${candidats.length} résultats, retenu ${video.id}`
      : "aucune vidéo trouvée",
    video?.id ? null : "ytsSearch ne renvoie rien",
  );

  if (!video?.id) {
    steps.ytdlp = step(false, `yt-dlp ${version}`, "aucune vidéo à extraire");
    steps.proxy = step(false, "non testé", "étape précédente KO");
  } else {
    try {
      const entry = await getYtAudioUrl(video.id);
      const client = new URL(entry.url).searchParams.get("c") ?? "—";
      steps.ytdlp = step(
        true,
        `yt-dlp ${version}, client ${client}, url ${entry.url.slice(0, 60)}…`,
      );
      const head = await fetch(entry.url, {
        headers: { Range: "bytes=0-1000" },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
      steps.proxy = step(
        Boolean(head && head.status < 400),
        `statut upstream ${head?.status ?? "injoignable"}`,
        head && head.status >= 400 ? `HTTP ${head.status}` : null,
      );
    } catch (e) {
      steps.ytdlp = step(false, `yt-dlp ${version}`, e.message);
      steps.proxy = step(
        false,
        "non testé — yt-dlp a échoué",
        "étape précédente KO",
      );
    }
  }

  const dz = await getDeezerPreview(track.artist, track.title).catch(
    () => null,
  );
  steps.deezer = step(
    Boolean(dz),
    dz ? `${dz.slice(0, 60)}…` : "aucun résultat",
    dz ? null : "Deezer ne renvoie rien",
  );

  const it = await getItunesPreview(track.artist, track.title).catch(
    () => null,
  );
  steps.itunes = step(
    Boolean(it),
    it ? `${it.slice(0, 60)}…` : "aucun résultat",
    it ? null : "iTunes ne renvoie rien",
  );

  return json({
    track: { id: track.id, artist: track.artist, title: track.title },
    steps,
    candidats,
    playable: overridePreviewUrl || stillValid || dz || it || null,
  });
}
