import { cleanString } from "./trackText.js";
import { deezerFetch } from "./deezerClient.js";

export function parseExpFromUrl(url) {
  const m = url?.match(/hdnea=exp=(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

const comparable = (s) =>
  cleanString((s ?? "").replace(/[\u2018\u2019]/g, "'")).replace(/\s+/g, " ");
// « Titre - Remastered 2011 » : la version n'entre pas dans la comparaison
const titleKey = (s) => comparable((s ?? "").split(" - ")[0]);
const noThe = (s) => s.replace(/^the /, "");
// Noms entiers : « Queen » ne doit jamais valider « Piano Queen »
const artistNames = (s) =>
  comparable(s)
    .split(/\s*(?:,|&|\b(?:et|and|feat\.?|ft\.?)(?=\s|$))\s*/)
    .map(noThe)
    .filter(Boolean);

function matchOf(results, artist, title) {
  const t = titleKey(title);
  if (!t) return null;
  const names = artistNames(artist);
  const candidates = results.filter(
    (r) => r.preview && titleKey(r.title) === t,
  );
  const same =
    candidates.find(
      (r) => noThe(comparable(r.artist)) === noThe(comparable(artist)),
    ) ??
    candidates.find((r) =>
      artistNames(r.artist).some((n) => names.includes(n)),
    );
  return same ?? null;
}

const previewOf = (results, artist, title) =>
  matchOf(results, artist, title)?.preview ?? null;

// Extrait trouvé par nom : seulement si l'artiste et le titre correspondent.
// Mieux vaut pas d'extrait qu'un autre morceau joué devant la salle.
async function deezerMatch(artist, title, opts, sameVersion = false) {
  const q = encodeURIComponent(`${artist} ${title.split(" - ")[0]}`);
  const res = await deezerFetch(`/search?q=${q}&limit=5`, opts);
  if (res?.error) throw new Error(`Deezer ${res.error.code}`);
  // Identifiant enregistré : une version « (Live) », « (Remix) » est refusée
  const data = (res?.data ?? []).filter(
    (r) => !sameVersion || !r.title_version?.trim(),
  );
  return matchOf(
    data.map((r) => ({
      id: r.id,
      preview: r.preview,
      artist: r.artist?.name,
      title: r.title_short ?? r.title,
    })),
    artist,
    title,
  );
}

export async function deezerPreviewMatch(artist, title) {
  try {
    return (
      (await deezerMatch(artist, title, { timeout: 5000 }))?.preview ?? null
    );
  } catch {
    return null;
  }
}

// Remplissage de fond : lève sur une panne réseau, pour ne pas marquer le
// titre comme cherché quand Deezer ne répondait pas
export async function deezerIdMatch(artist, title) {
  if (!artist || !title) return null;
  const hit = await deezerMatch(artist, title, { bulk: true }, true);
  return hit?.id ? String(hit.id) : null;
}

export async function iTunesPreviewMatch(artist, title) {
  if (!artist || !title) return null;
  try {
    const q = encodeURIComponent(`${artist} ${title.split(" - ")[0]}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${q}&entity=song&limit=5`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const { results } = await res.json();
    return previewOf(
      (results ?? []).map((r) => ({
        preview: r.previewUrl,
        artist: r.artistName,
        title: r.trackName,
      })),
      artist,
      title,
    );
  } catch {
    return null;
  }
}

export async function fetchDeezerTrackPreview(trackId) {
  try {
    const data = await deezerFetch(`/track/${trackId}`);
    if (data.error || !data.preview) return null;
    return data.preview;
  } catch {
    return null;
  }
}
