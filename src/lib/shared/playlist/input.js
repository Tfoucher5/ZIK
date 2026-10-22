import { extractYoutubeId } from "../youtube.js";

const DEEZER_RE = /deezer\.com\/(?:[a-z]{2}\/)?(playlist|album|artist)\/(\d+)/i;
const SPOTIFY_RE = /open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/(\w+)/i;

// Ce que l'utilisateur a tapé ou collé dans la barre d'ajout.
export function detectInput(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return { kind: "empty" };
  if (lines(raw).length >= 2) return { kind: "list" };
  const dz = raw.match(DEEZER_RE);
  if (dz) return { kind: `deezer-${dz[1].toLowerCase()}`, id: dz[2] };
  const sp = raw.match(SPOTIFY_RE);
  if (sp) return { kind: "spotify-playlist", id: sp[1] };
  if (/^https?:\/\//i.test(raw)) {
    const yt = extractYoutubeId(raw);
    return yt ? { kind: "youtube", id: yt } : { kind: "unknown-link" };
  }
  return { kind: "search", q: raw };
}

function lines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

const SEPARATORS = [" - ", " – ", " — ", "\t", " by ", " par "];

// « 03. Daft Punk - One More Time (5:20) » → { artist, title }
export function parseLine(line) {
  const clean = line
    .replace(/^\s*(\d{1,3}\s*[.)/-]|\d{1,3}\s+|[-*•]\s*)/, "")
    .replace(/\s*[([]?\d{1,2}:\d{2}[)\]]?\s*$/, "")
    .trim();
  for (const sep of SEPARATORS) {
    const i = clean.indexOf(sep);
    if (i > 0) {
      const a = clean.slice(0, i).trim();
      const b = clean.slice(i + sep.length).trim();
      if (!a || !b) continue;
      const titleFirst = sep === " by " || sep === " par ";
      return titleFirst
        ? { artist: b, title: a, query: clean }
        : { artist: a, title: b, query: clean };
    }
  }
  return { artist: "", title: "", query: clean };
}

export function parseList(text) {
  const seen = new Set();
  return lines(text)
    .map(parseLine)
    .filter((p) => {
      const k = p.query.toLowerCase();
      if (!p.query || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 100);
}

export function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Le résultat Deezer correspond-il à la ligne collée ?
export function isLikelyMatch(parsed, track) {
  const t = norm(track.title);
  const a = norm(track.artist);
  if (parsed.artist) {
    const pa = norm(parsed.artist);
    const pt = norm(parsed.title);
    const artistOk = a.includes(pa) || pa.includes(a);
    const titleOk = t.includes(pt) || pt.includes(t);
    // Liste au format « titre - artiste »
    const swapped =
      (t.includes(pa) || pa.includes(t)) && (a.includes(pt) || pt.includes(a));
    return (artistOk && titleOk) || swapped;
  }
  const q = norm(parsed.query);
  return !!t && q.includes(t) && q.includes(a);
}

const VARIANT_RE =
  /\b(live|remix|mix|version|edit|acoustic|acoustique|instrumental|karaoke|cover|remaster(ed)?)\b/i;

// 0 : ne correspond pas. Sinon, plus c'est haut, plus c'est la version attendue :
// titre exact, et pas de live/remix que la ligne collée ne demandait pas.
export function matchScore(parsed, track) {
  if (!isLikelyMatch(parsed, track)) return 0;
  const asked = parsed.title || parsed.query;
  let score = 1;
  if (norm(track.title) === norm(parsed.title)) score += 2;
  if (!VARIANT_RE.test(track.title) || VARIANT_RE.test(asked)) score += 1;
  return score;
}

const NOISE_RE =
  /\s*[([](?:official|clip|lyrics?|audio|video|vid[ée]o|hd|hq|4k|visuali[sz]er|paroles)[^)\]]*[)\]]/gi;

// Artiste et titre devinés depuis une vidéo YouTube, à corriger par le joueur.
export function guessFromVideo(title, channel) {
  const t = String(title ?? "")
    .replace(NOISE_RE, "")
    .trim();
  const ch = String(channel ?? "");
  if (ch.endsWith(" - Topic")) return { artist: ch.slice(0, -8), title: t };
  const p = parseLine(t);
  if (p.artist) return { artist: p.artist, title: p.title };
  return { artist: ch.replace(/VEVO$/i, "").trim(), title: t };
}

// Pochette Deezer en petite taille pour les listes (la XL pèse ~150 Ko).
export function coverThumb(url, size = 120) {
  return url?.replace(/\/\d+x\d+-/, `/${size}x${size}-`) ?? null;
}
