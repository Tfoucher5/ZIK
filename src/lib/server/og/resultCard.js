export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const BG = "#080808";
const ACCENT = "#ff00ff";
const TEXT = "#fafafa";
const MID = "#8896aa";
const GOLD = "#fbbf24";
const SILVER = "#94a3b8";
const BRONZE = "#b06a3b";

const MEDAL_COLORS = { 1: GOLD, 2: SILVER, 3: BRONZE };

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Les polices embarquées ne couvrent pas les emoji : sans ce filtrage, resvg
// dessine des rectangles vides à leur place.
function stripEmoji(str) {
  return String(str)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/gu, "")
    .replace(/\u{FE0F}/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function truncate(str, max) {
  const clean = stripEmoji(str);
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function medal(rank, cx, cy) {
  const color = MEDAL_COLORS[rank];
  if (!color) return "";
  return `
    <circle cx="${cx}" cy="${cy}" r="34" fill="${color}" opacity="0.16" />
    <circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="${color}" stroke-width="3" />
    <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="38" fill="${color}">${rank}</text>`;
}

/**
 * Carte de score 1200x630 pour l'aperçu des liens partagés (og:image).
 * Rendue en SVG puis rasterisée : tout est vectoriel, aucune image externe.
 */
export function buildResultCardSvg({
  username,
  score,
  rank,
  totalPlayers,
  roomName,
}) {
  const name = truncate(username ?? "Joueur", 22);
  const room = truncate(roomName ?? "Blind test", 34);
  const rankLabel = `${rank}${rank === 1 ? "er" : "e"} sur ${totalPlayers} joueur${totalPlayers > 1 ? "s" : ""}`;
  const hasMedal = Boolean(MEDAL_COLORS[rank]);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <radialGradient id="aurora1" cx="0.18" cy="0.12" r="0.65">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.32" />
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="aurora2" cx="0.9" cy="0.95" r="0.7">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="${ACCENT}" />
    </linearGradient>
  </defs>

  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${BG}" />
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#aurora1)" />
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#aurora2)" />

  <rect x="48" y="48" width="${OG_WIDTH - 96}" height="${OG_HEIGHT - 96}" rx="28"
        fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" />

  <text x="96" y="140" font-family="Barlow Condensed" font-weight="800" font-size="46" fill="${TEXT}" letter-spacing="1">ZIK<tspan fill="${ACCENT}">.</tspan></text>

  <rect x="96" y="178" width="${Math.min(560, 34 + room.length * 15)}" height="52" rx="26"
        fill="${ACCENT}" fill-opacity="0.12" stroke="${ACCENT}" stroke-opacity="0.4" stroke-width="1.5" />
  <text x="122" y="213" font-family="Barlow" font-weight="600" font-size="26" fill="${ACCENT}">${escapeXml(room)}</text>

  <text x="96" y="330" font-family="Barlow Condensed" font-weight="800" font-size="86" fill="${TEXT}">${escapeXml(name)}</text>

  <text x="96" y="470" font-family="Barlow Condensed" font-weight="800" font-size="150" fill="url(#scoreFill)">${score}</text>
  <text x="${118 + String(score).length * 72}" y="470" font-family="Barlow" font-weight="600" font-size="44" fill="${MID}">pts</text>

  ${hasMedal ? medal(rank, 130, 542) : ""}
  <text x="${hasMedal ? 182 : 96}" y="556" font-family="Barlow" font-weight="600" font-size="34" fill="${MID}">${escapeXml(rankLabel)}</text>

  <text x="${OG_WIDTH - 96}" y="556" text-anchor="end" font-family="Barlow" font-weight="600" font-size="30" fill="${MID}">zik-music.fr</text>
</svg>`;
}
