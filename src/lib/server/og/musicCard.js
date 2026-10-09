import { escapeXml, truncate } from "./resultCard.js";

export const CARD_WIDTH = 750;
export const CARD_HEIGHT = 1050;

// Version figée de la carte (src/lib/components/card/Card.svelte) pour le
// partage : mêmes proportions, mêmes couleurs, sans les effets de lumière.
const PALETTES = {
  common: {
    rc: "#8b9099",
    light: "#c3c6cb",
    dark: "#50545a",
    ink: "#17181b",
    bg: ["#1e1f22", "#0d0d0f"],
    glow: "#8b9099",
    disc: ["#3d4046", "#1d1f23", "#141518"],
  },
  uncommon: {
    rc: "#2fbf71",
    light: "#8fe0b4",
    dark: "#1a6e42",
    ink: "#052a16",
    bg: ["#10251b", "#060f0a"],
    glow: "#2fbf71",
    disc: ["#45d48c", "#1c8c54", "#106a3d"],
  },
  rare: {
    rc: "#3b82f6",
    light: "#9dbffa",
    dark: "#22498b",
    ink: "#ffffff",
    bg: ["#0c1a36", "#050913"],
    glow: "#3b82f6",
    disc: ["#93c5fd", "#2563eb", "#1e40af"],
  },
  epic: {
    rc: "#9b5cf6",
    light: "#c9a8fa",
    dark: "#5a3590",
    ink: "#ffffff",
    bg: ["#1e0f36", "#090514"],
    glow: "#9b5cf6",
    disc: ["#e9d5ff", "#a855f7", "#4c1d95"],
  },
  legendary: {
    rc: "#e8b84a",
    light: "#f3d995",
    dark: "#8a6b2a",
    ink: "#3d2905",
    bg: ["#2b200b", "#0d0903"],
    glow: "#e8b84a",
    disc: ["#fff0bd", "#d6ab4f", "#7a5212"],
  },
  mythic: {
    rc: "#ff4fc8",
    light: "#ffa3e3",
    dark: "#942e75",
    ink: "#3f0530",
    bg: ["#3a0a2e", "#12020e"],
    glow: "#ff4fc8",
    disc: ["#ffa3e9", "#ff4fc8", "#a80f76"],
  },
};

const U = CARD_WIDTH / 100; // 1 « cqw » de la carte affichée

const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function grooves(cx, cy, r) {
  let out = "";
  for (let g = r * 0.47; g < r * 0.95; g += 3.2)
    out += `<circle cx="${cx}" cy="${cy}" r="${g.toFixed(1)}" fill="none" stroke="#fff" stroke-opacity="0.07" stroke-width="0.8" />`;
  for (const k of [0.58, 0.72, 0.85])
    out += `<circle cx="${cx}" cy="${cy}" r="${(r * k).toFixed(1)}" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="2" />`;
  return out;
}

/**
 * Carte 750x1050 rendue en SVG puis rasterisée (svgToPng) pour le partage.
 * `cover` est la pochette en data URI : resvg ne télécharge rien lui-même.
 */
export function buildMusicCardSvg(card, cover) {
  const p = PALETTES[card.rarity];
  const title = truncate(card.title, 26);
  const titleSize = title.length > 17 ? 58 : 72;
  const popularity = (card.rank / 10_000).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const found =
    card.successRate == null ? "-" : `${Math.round(card.successRate * 100)} %`;

  const disc = { cx: 63 * U, cy: 40 * U, r: 32 * U };
  const coverBox = { x: 14 * U, y: 5 * U, s: 70 * U };
  const obiW = 11 * U;
  const stats = [
    [popularity, "popularité", p.light],
    [compact.format(card.fans), "fans", "#f5f3f8"],
    [found, "trouvée", "#f5f3f8"],
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <clipPath id="card"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${4.5 * U}" /></clipPath>
    <clipPath id="cover"><rect x="${coverBox.x}" y="${coverBox.y}" width="${coverBox.s}" height="${coverBox.s}" rx="${U}" /></clipPath>
    <clipPath id="label"><circle cx="${disc.cx}" cy="${disc.cy}" r="${disc.r * 0.36}" /></clipPath>
    <linearGradient id="bg" x1="0.25" y1="0" x2="0.75" y2="1">
      <stop offset="0%" stop-color="${p.bg[0]}" />
      <stop offset="100%" stop-color="${p.bg[1]}" />
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.22" r="0.55">
      <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${p.glow}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="disc" cx="0.5" cy="0.5" r="0.5">
      <stop offset="20%" stop-color="${p.disc[0]}" />
      <stop offset="65%" stop-color="${p.disc[1]}" />
      <stop offset="100%" stop-color="${p.disc[2]}" />
    </radialGradient>
    <linearGradient id="obi" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.light}" />
      <stop offset="55%" stop-color="${p.rc}" />
      <stop offset="100%" stop-color="${p.dark}" />
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="45" /></filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="9" dy="12" stdDeviation="14" flood-color="#000" flood-opacity="0.55" />
    </filter>
  </defs>

  <g clip-path="url(#card)">
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)" />
    ${
      card.rarity === "mythic" && cover
        ? `<image href="${cover}" x="-200" y="-150" width="1150" height="1150" preserveAspectRatio="xMidYMid slice" filter="url(#blur)" opacity="0.55" />
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${p.bg[1]}" fill-opacity="0.55" />`
        : ""
    }
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#glow)" />

    <g filter="url(#shadow)">
      <circle cx="${disc.cx}" cy="${disc.cy}" r="${disc.r}" fill="url(#disc)" />
    </g>
    ${grooves(disc.cx, disc.cy, disc.r)}
    ${cover ? `<image href="${cover}" x="${disc.cx - disc.r * 0.36}" y="${disc.cy - disc.r * 0.36}" width="${disc.r * 0.72}" height="${disc.r * 0.72}" clip-path="url(#label)" />` : ""}
    <circle cx="${disc.cx}" cy="${disc.cy}" r="${disc.r * 0.36}" fill="none" stroke="${p.rc}" stroke-width="4" />

    <rect x="${coverBox.x}" y="${coverBox.y}" width="${coverBox.s}" height="${coverBox.s}" rx="${U}" fill="#111" filter="url(#shadow)" />
    ${cover ? `<image href="${cover}" x="${coverBox.x}" y="${coverBox.y}" width="${coverBox.s}" height="${coverBox.s}" clip-path="url(#cover)" />` : ""}

    <rect width="${obiW}" height="${CARD_HEIGHT}" fill="url(#obi)" />
    <text transform="rotate(-90 ${obiW / 2 + 13} ${CARD_HEIGHT - 34})" x="${obiW / 2 + 13}" y="${CARD_HEIGHT - 34}" font-family="Barlow Condensed" font-weight="800" font-size="40" fill="${p.ink}">${escapeXml(card.rarityLabel)}</text>
    <text transform="rotate(-90 ${obiW / 2 + 8} 34)" x="${obiW / 2 + 8}" y="34" text-anchor="end" font-family="Barlow Condensed" font-weight="800" font-size="25" fill="${p.ink}" fill-opacity="0.75">n° ${card.number}</text>

    <text x="${15 * U}" y="${92 * U}" font-family="Barlow Condensed" font-weight="800" font-size="${titleSize}" fill="#f5f3f8">${escapeXml(title)}</text>
    <text x="${15 * U}" y="${99 * U}" font-family="Barlow" font-weight="600" font-size="34" fill="#f5f3f8" fill-opacity="0.9">${escapeXml(truncate(card.artist, 30))}</text>
    <text x="${15 * U}" y="${104 * U}" font-family="Barlow" font-weight="600" font-size="26" fill="#f5f3f8" fill-opacity="0.65">${escapeXml(truncate(`${card.album}, ${card.year}`, 40))}</text>

    <line x1="${15 * U}" y1="${118 * U}" x2="${95 * U}" y2="${118 * U}" stroke="#fff" stroke-opacity="0.14" stroke-width="1.5" />
    ${stats
      .map(
        ([value, label, color], i) => `
    <text x="${15 * U + i * 27 * U}" y="${127 * U}" font-family="Barlow Condensed" font-weight="800" font-size="46" fill="${color}">${escapeXml(value)}</text>
    <text x="${15 * U + i * 27 * U}" y="${131.5 * U}" font-family="Barlow" font-weight="600" font-size="21" fill="#f5f3f8" fill-opacity="0.65">${label}</text>`,
      )
      .join("")}
    <text x="${95 * U}" y="${138 * U}" text-anchor="end" font-family="Barlow" font-weight="600" font-size="19" fill="#f5f3f8" fill-opacity="0.45">zik-music.fr</text>
  </g>
  <rect x="1" y="1" width="${CARD_WIDTH - 2}" height="${CARD_HEIGHT - 2}" rx="${4.5 * U}" fill="none" stroke="${p.rc}" stroke-opacity="0.55" stroke-width="2" />
</svg>`;
}
