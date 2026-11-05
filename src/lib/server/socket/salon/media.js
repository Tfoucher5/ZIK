import {
  deezerPreviewMatch,
  fetchDeezerTrackPreview,
} from "../../services/music/deezer.js";
import { validPreviewUrl } from "../game/audio.js";
import { knownVideo } from "./tracks.js";
import { staff } from "./players.js";

// Ce que la TV joue pour un titre. Le 30/10, YouTube ne répondait plus et les
// parties s'arrêtaient : le serveur n'appelle plus YouTube en partie, et sans
// vidéo connue on joue l'extrait Deezer plutôt que de sauter le titre.

export async function findVideo(salon, track) {
  const known = salon.game.videos?.get(track);
  if (known) return known;
  const found = await knownVideo(track, salon.settings.roundDuration);
  const videos = (salon.game.videos ??= new Map());
  // Deux demandes en même temps gardent le même départ : la TV précharge le bon
  if (!videos.has(track)) videos.set(track, found);
  return videos.get(track);
}

// Résultat gardé du lobby à la manche : Deezer a un quota
const previews = new WeakMap();
const PREVIEW_TTL_MS = 5 * 60 * 1000;
const NO_PREVIEW_TTL_MS = 30 * 1000;
// L'attente se passe dans le chemin d'une manche : elle reste courte
const PREVIEW_WAIT_MS = 5000;

async function fetchPreview(track) {
  // Seuls les titres importés de Deezer ont un id numérique Deezer
  const byId = /^\d+$/.test(track.external_id ?? "")
    ? await fetchDeezerTrackPreview(track.external_id)
    : null;
  return (
    byId ||
    validPreviewUrl(track.preview_url) ||
    deezerPreviewMatch(track.mainArtist || track.artist, track.title)
  );
}

// Lien d'extrait frais : ceux de Deezer expirent, celui en base peut être périmé
export async function previewUrl(track) {
  const hit = previews.get(track);
  if (hit && hit.exp > Date.now() && (!hit.url || validPreviewUrl(hit.url)))
    return hit.url;
  let timer;
  const url = await Promise.race([
    fetchPreview(track),
    new Promise((resolve) => {
      timer = setTimeout(
        () => resolve(validPreviewUrl(track.preview_url)),
        PREVIEW_WAIT_MS,
      );
    }),
  ]);
  clearTimeout(timer);
  previews.set(track, {
    url,
    exp: Date.now() + (url ? PREVIEW_TTL_MS : NO_PREVIEW_TTL_MS),
  });
  return url;
}

export async function resolveMedia(salon, track) {
  try {
    return await findVideo(salon, track);
  } catch (err) {
    const audio = await previewUrl(track);
    if (audio) return { audio, safeStart: 0 };
    throw err;
  }
}

// Vérification dès le lobby : toute la musique de la partie est cherchée avant
// le lancement, la TV et la régie voient ce qui est prêt
export async function checkSession(salon, io) {
  const game = salon.game;
  const tracks = [...game.sessionPlaylist].reverse();
  const check = { total: tracks.length, video: 0, audio: 0, missing: 0 };
  game.mediaCheck = check;
  const send = () => {
    if (game.mediaCheck === check)
      staff(salon.code, io).emit("salon_media_check", check);
  };
  send();
  let next = 0;
  const worker = async () => {
    while (next < tracks.length && game.mediaCheck === check) {
      const track = tracks[next++];
      try {
        await findVideo(salon, track);
        check.video++;
      } catch {
        if (await previewUrl(track)) check.audio++;
        else check.missing++;
      }
      send();
    }
  };
  await Promise.all([worker(), worker()]);
}
