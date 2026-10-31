import { fetchDeezerTrackPreview } from "../../services/music/deezer.js";
import { searchTrackVideo } from "./tracks.js";
import { staff } from "./players.js";

// Ce que la TV joue pour un titre. Le 30/10, YouTube ne répondait plus et les
// parties s'arrêtaient : la vidéo trouvée une fois est gardée pour tout le
// salon, et sans vidéo on joue l'extrait Deezer plutôt que de sauter le titre.

const searching = new WeakMap();

export function findVideo(salon, track) {
  const known = salon.game.videos?.get(track);
  if (known) return Promise.resolve(known);
  let pending = searching.get(track);
  if (!pending) {
    pending = searchTrackVideo(track, salon.settings.roundDuration)
      .then((found) => {
        (salon.game.videos ??= new Map()).set(track, found);
        return found;
      })
      .finally(() => searching.delete(track));
    searching.set(track, pending);
  }
  return pending;
}

// Lien d'extrait frais : ceux de Deezer expirent, celui en base peut être périmé
export async function previewUrl(track) {
  const fresh = track.external_id
    ? await fetchDeezerTrackPreview(track.external_id)
    : null;
  return fresh || track.preview_url || null;
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
