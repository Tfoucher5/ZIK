import { teamColor } from "../../../data/salonOptions.js";

// Story Instagram / TikTok : 9:16
export const STORY_W = 1080;
export const STORY_H = 1920;

const place = (n) => (n === 1 ? "1re" : `${n}e`);

// Podium (équipes ou joueurs) et la ligne du joueur, à partir de ce que le téléphone a reçu
export function storyData({ finalRanking, teams, username, myTeam }) {
  if (teams?.length) {
    const i = teams.findIndex((t) => t.id === myTeam);
    return {
      podium: teams.slice(0, 3).map((t, k) => ({
        rank: k + 1,
        name: t.name,
        score: t.score,
        color: teamColor(t.id),
      })),
      mine: i >= 0 ? `Mon équipe, à la ${place(i + 1)} place` : null,
    };
  }
  const me = finalRanking?.me;
  return {
    podium: (finalRanking?.top ?? []).slice(0, 3).map((p) => ({
      rank: p.rank,
      name: p.username,
      score: p.score,
      color: null,
    })),
    mine: me
      ? `${username}, à la ${place(me.rank)} place sur ${finalRanking.count}`
      : null,
  };
}

const COND = '"Barlow Condensed", "Arial Narrow", sans-serif';
const MONO = '"JetBrains Mono", monospace';
const MEDAL = { 1: "#fbbf24", 2: "#94a3b8", 3: "#b06a3b" };
// Zone lisible d'une story : hors de là, l'interface d'Instagram ou de TikTok cache le texte
const X0 = 70;
const X1 = 930;

function fit(ctx, text, max, size, weight, family) {
  let s = size;
  do ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > max && (s -= 4) > 24);
}

export async function drawStory(canvas, { podium, mine }) {
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");
  await Promise.all(
    ['900 120px "Barlow Condensed"', '600 48px "JetBrains Mono"'].map((f) =>
      document.fonts?.load(f).catch(() => null),
    ),
  );

  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#fafafa";
  ctx.font = `900 96px ${COND}`;
  ctx.fillText("ZIK", X0, 260);
  const zik = ctx.measureText("ZIK ").width;
  ctx.fillStyle = "#ff00ff";
  ctx.fillText("SOIRÉE", X0 + zik, 260);

  ctx.fillStyle = "#8896aa";
  ctx.font = `600 34px ${MONO}`;
  ctx.fillText("BLIND TEST · LE PODIUM", X0, 320);

  if (mine) {
    ctx.fillStyle = "#fafafa";
    fit(ctx, mine, X1 - X0, 76, 900, COND);
    ctx.fillText(mine, X0, 480);
  }

  // Marches : 2e à gauche, 1re au centre, 3e à droite
  const w = (X1 - X0) / 3;
  const slots = [
    { rank: 2, x: X0, h: 340 },
    { rank: 1, x: X0 + w, h: 480 },
    { rank: 3, x: X0 + 2 * w, h: 240 },
  ];
  const base = 1330;
  for (const s of slots) {
    const e = podium.find((p) => p.rank === s.rank);
    const color = e?.color ?? MEDAL[s.rank];
    ctx.fillStyle = s.rank === 1 ? "#fafafa" : "#161616";
    ctx.fillRect(s.x, base - s.h, w, s.h);
    ctx.fillStyle = color;
    ctx.fillRect(s.x, base - s.h, w, 10);
    ctx.fillStyle = s.rank === 1 ? "#080808" : "#8896aa";
    ctx.font = `900 150px ${COND}`;
    ctx.textAlign = "center";
    ctx.fillText(String(s.rank), s.x + w / 2, base - s.h + 170);
    if (e) {
      ctx.fillStyle = color;
      fit(ctx, e.name, w - 16, 64, 900, COND);
      ctx.fillText(e.name, s.x + w / 2, base - s.h - 70);
      ctx.fillStyle = "#fafafa";
      ctx.font = `600 36px ${MONO}`;
      ctx.fillText(`${e.score} pts`, s.x + w / 2, base - s.h - 24);
    }
    ctx.textAlign = "left";
  }

  ctx.fillStyle = "#8896aa";
  ctx.font = `600 36px ${MONO}`;
  ctx.fillText("zik-music.fr", X0, 1440);
  return canvas;
}

const SITE_URL = "https://www.zik-music.fr";

/**
 * Partage la story du podium : menu de partage du téléphone avec l'image,
 * sinon téléchargement. Retourne "shared", "downloaded" ou "cancelled".
 */
export async function shareStory(data) {
  const canvas = await drawStory(document.createElement("canvas"), data);
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
  const file = new File([blob], "zik-podium.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: "Le podium de notre blind test ZIK Soirée",
        url: SITE_URL,
      });
      return "shared";
    } catch (e) {
      if (e.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
