const ID_RE = /^[\w-]{11}$/;
const HOST_RE = /^(www\.|m\.|music\.)?(youtube\.com|youtube-nocookie\.com)$/;

// ID d'une vidéo depuis un lien collé (watch, youtu.be, shorts, embed) ou un ID brut.
export function extractYoutubeId(input) {
  const raw = String(input ?? "").trim();
  if (ID_RE.test(raw)) return raw;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  let id = null;
  if (url.hostname === "youtu.be") id = url.pathname.slice(1);
  else if (HOST_RE.test(url.hostname)) {
    const m = url.pathname.match(/^\/(shorts|embed)\/([^/]+)/);
    id = m ? m[2] : url.searchParams.get("v");
  }
  return id && ID_RE.test(id) ? id : null;
}

// Heuristique du jeu : la chaîne « - Topic » publie l'audio officiel du titre.
export function pickAutoIndex(results) {
  if (!results.length) return -1;
  const topic = results.findIndex(
    (v) => v.channel?.endsWith("- Topic") || v.uploader?.endsWith("- Topic"),
  );
  return topic === -1 ? 0 : topic;
}
