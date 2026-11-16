import { teamHex } from "../../../data/salonOptions.js";
import { shareFile, downloadBlob } from "../../../client/shareFile.js";

// Story Instagram / TikTok : 9:16
export const STORY_W = 1080;
export const STORY_H = 1920;

// Couleurs de base/v2.css : or, argent, bronze, magenta hors podium
export const MEDAL = ["#f4c542", "#b4b4c4", "#c87a40"];
export const ACCENT = "#ff00ff";

const ord = (n) => `${n}${n === 1 ? "re" : "e"}`;
const pts = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const dateFr = (d) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);

// Ma colonne : ma place (ou celle de mon équipe), à partir de ce que le téléphone a reçu
export function storyData({
  finalRanking,
  teams,
  username,
  myTeam,
  round,
  now = new Date(),
}) {
  const me = finalRanking?.me;
  const i = teams?.length ? teams.findIndex((t) => t.id === myTeam) : -1;
  const base = (rank) => ({
    rank,
    color: MEDAL[rank - 1] ?? ACCENT,
    date: dateFr(now),
  });
  if (i >= 0) {
    const t = teams[i];
    return {
      ...base(i + 1),
      count: teams.length,
      unit: `place sur ${teams.length} équipe${teams.length > 1 ? "s" : ""}`,
      name: t.name,
      score: pts(t.score),
      average: true,
      found: null,
      team: teamHex(t.id),
      line: `Mon équipe, à la ${ord(i + 1)} place`,
    };
  }
  // Sans équipe choisie, la place du joueur
  if (!me) return null;
  const n = me.found;
  return {
    ...base(me.rank),
    count: finalRanking.count,
    unit: `place sur ${finalRanking.count}`,
    name: username,
    score: pts(me.score),
    average: false,
    found:
      Number.isInteger(n) && round > 0
        ? `${n} ${n > 1 ? "titres trouvés" : "titre trouvé"} sur ${round}`
        : null,
    team: null,
    line: `${username}, à la ${ord(me.rank)} place sur ${finalRanking.count}`,
  };
}

// Une marche par place, 8 au plus : au-delà, une fenêtre de 8 autour du joueur
export function storySteps(rank, count) {
  const n = Math.min(count, 8);
  const first = Math.max(1, Math.min(rank - 3, count - n + 1));
  return { n, at: rank - first };
}

const COND = '"Barlow Condensed", "Arial Narrow", sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const COL = 604;
const step = (k) => 506 + k * 30;
// Zone lisible d'une story : hors de là, l'interface d'Instagram ou de TikTok cache le texte
const X0 = 70;
const X1 = 930;
const Y1 = 1470;

function setFont(ctx, weight, size, family, spacing = 0) {
  ctx.font = `${weight} ${size}px ${family}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing * size}px`;
}

// Ligne de texte posée comme en CSS : `top` est le haut de sa boîte de hauteur size × lh
function line(ctx, text, x, top, size, lh, max) {
  const m = ctx.measureText(text);
  const asc = m.fontBoundingBoxAscent ?? size * 0.8;
  const desc = m.fontBoundingBoxDescent ?? size * 0.2;
  ctx.fillText(text, x, top + (size * lh - asc - desc) / 2 + asc, max);
  return top + size * lh;
}

function background(ctx) {
  ctx.fillStyle = "#050507";
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  // radial-gradient(100% 46% at 16% 0%, #24092b, #050507 72%)
  const ry = STORY_H * 0.46;
  ctx.save();
  ctx.translate(STORY_W * 0.16, 0);
  ctx.scale(1, ry / STORY_W);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, STORY_W);
  g.addColorStop(0, "#24092b");
  g.addColorStop(0.72, "#050507");
  ctx.fillStyle = g;
  ctx.fillRect(-STORY_W, 0, 3 * STORY_W, STORY_W);
  ctx.restore();
}

function header(ctx, date) {
  ctx.fillStyle = "#fafafa";
  setFont(ctx, 900, 120, COND);
  const m = ctx.measureText("ZIK");
  const asc = m.fontBoundingBoxAscent ?? 96;
  const desc = m.fontBoundingBoxDescent ?? 24;
  const base = 188 + (120 - asc - desc) / 2 + asc;
  ctx.fillText("ZIK", X0, base);
  const r = 13.8;
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(X0 + m.width + 12 + r, base - r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fafafa";
  setFont(ctx, 800, 66, COND);
  line(ctx, date.toUpperCase(), X0, 188 + 120 + 22, 66, 1);
}

// Barres muettes : 26 px pleins, 8 px de vide, depuis le bas
function bar(ctx, x, top) {
  ctx.fillStyle = "rgba(255,255,255,.13)";
  for (let y = STORY_H; y > top; y -= 34) {
    ctx.fillRect(x, Math.max(top, y - 26), 56, y - Math.max(top, y - 26));
  }
}

function fitFont(ctx, text, max, size, weight, spacing) {
  let s = size;
  setFont(ctx, weight, s, COND, spacing);
  while (ctx.measureText(text).width > max && s > 48) {
    s -= 4;
    setFont(ctx, weight, s, COND, spacing);
  }
  return s;
}

function rounded(ctx, x, y, size, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, size, size, r);
  else ctx.rect(x, y, size, size);
  ctx.fill();
}

function column(ctx, d, left, top) {
  ctx.fillStyle = d.color;
  ctx.fillRect(left, top, COL, STORY_H - top);
  ctx.fillRect(left, top - 34, COL, 14);

  const x = left + Math.max(40, X0 - left);
  const w = left + COL - Math.max(40, left + COL - X1) - x;
  ctx.fillStyle = "#000";
  let y = top + 30;

  // « 1 » en 340 px, « re » en 0,46 em calé en haut de la ligne
  setFont(ctx, 900, 340, COND, -0.02);
  const nb = String(d.rank);
  const y0 = y + 340 * 0.04;
  y = line(ctx, nb, x, y0, 340, 0.8);
  const suf = 340 * 0.46;
  const sx = x + ctx.measureText(nb).width + suf * 0.04;
  setFont(ctx, 900, suf, COND, -0.02);
  line(ctx, ord(d.rank).slice(nb.length), sx, y0, suf, 0.8);
  setFont(ctx, 900, 66, COND);
  y = line(ctx, d.unit.toUpperCase(), x, y + 14, 66, 1);

  if (d.team) {
    y += 30;
    rounded(ctx, x - 4, y - 3, 38, 10);
    ctx.fillStyle = d.team;
    rounded(ctx, x, y + 1, 30, 6);
    ctx.fillStyle = "#000";
    setFont(ctx, 700, 32, MONO, 0.1);
    y = line(ctx, "MON ÉQUIPE", x + 46, y, 32, 1);
  } else {
    y += 26;
  }

  const name = d.name.toLocaleUpperCase("fr");
  const s = fitFont(ctx, name, w, 180, 900, -0.01);
  y = line(ctx, name, x, y + s * 0.1, s, 0.86, w);

  setFont(ctx, 700, 56, MONO);
  y = line(ctx, `${d.score} pts`, x, y + 8, 56, 1.15);
  if (d.average) {
    setFont(ctx, 500, 32, MONO);
    line(ctx, "de moyenne", x, y, 32, 1.15);
  }
  if (d.found) {
    setFont(ctx, 500, 34, MONO);
    line(ctx, d.found, x, y + 18, 34, 1.25);
  }

  ctx.fillRect(x, Y1 - 18 - 3, 60, 6);
  setFont(ctx, 700, 36, MONO);
  line(ctx, "zik-music.fr", x + 78, Y1 - 36, 36, 1);
}

export async function drawStory(canvas, d) {
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");
  // Polices du site chargées avant de dessiner, accents du pseudo compris
  const sample = `${d.name}${d.unit}${d.date}ÉÈ0123456789`;
  await Promise.all(
    [
      `900 100px ${COND}`,
      `800 100px ${COND}`,
      `500 32px ${MONO}`,
      `700 32px ${MONO}`,
    ].map((f) => document.fonts?.load(f, sample).catch(() => null)),
  );

  background(ctx);
  header(ctx, d.date);

  const { n, at } = storySteps(d.rank, d.count);
  let x = (n - 1) * 68 + COL >= STORY_W ? 0 : X0;
  let mine = 0;
  for (let k = 0; k < n; k++) {
    if (k === at) {
      mine = x;
      x += COL + 12;
    } else {
      bar(ctx, x, step(k));
      x += 68;
    }
  }
  column(ctx, d, mine, step(at));
  return canvas;
}

// Image prête avant le clic : sur iPhone, le partage doit partir pendant le geste
export async function prepareStory(data) {
  const canvas = await drawStory(document.createElement("canvas"), data);
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) throw new Error("image");
  return new File([blob], "zik-podium.png", { type: "image/png" });
}

/** Menu de partage du téléphone, sinon téléchargement : "shared", "cancelled" ou "downloaded". */
export async function shareStory(file) {
  const r = await shareFile(file, "Le podium de notre blind test ZIK Soirée");
  if (r) return r;
  downloadBlob(file, file.name);
  return "downloaded";
}
