// Mise en page commune des e-mails ZIK : mêmes codes que le site (fond noir,
// magenta, titres condensés en capitales, bouton à ombre décalée).
// Les messageries ignorent la plupart du CSS : tout est en tableaux et en
// styles en ligne, les polices du site ont des équivalents système.

const ACCENT = "#ff00ff";
const BG = "#080808";
const CARD = "#101010";
const TEXT = "#fafafa";
const MID = "#a3adbd";
const CONDENSED =
  "'Barlow Condensed','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";
const SANS = "'Barlow',Helvetica,Arial,sans-serif";

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function kicker(label) {
  return `<p style="margin:0 0 12px;font-family:${MONO};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${ACCENT}">&#9679; ${label}</p>`;
}

export function title(html) {
  return `<h1 style="margin:0 0 20px;font-family:${CONDENSED};font-weight:900;font-size:38px;line-height:36px;text-transform:uppercase;color:${TEXT}">${html}</h1>`;
}

export function paragraph(html) {
  return `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:25px;color:${MID}">${html}</p>`;
}

export function strong(text) {
  return `<strong style="color:${TEXT}">${text}</strong>`;
}

// Bouton magenta avec ombre blanche décalée, en tableaux imbriqués
export function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">
  <tr><td style="background:${TEXT};padding:0 4px 4px 0">
    <a href="${href}" style="display:block;background:${ACCENT};border:2px solid ${ACCENT};padding:14px 26px;font-family:${CONDENSED};font-weight:900;font-size:17px;letter-spacing:1px;text-transform:uppercase;color:#000000;text-decoration:none">${label}</a>
  </td></tr>
</table>`;
}

// Tableau à deux colonnes (libellé / valeur), bordures fines
export function facts(rows) {
  const lines = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #262626;font-family:${MONO};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${MID}">${label}</td><td style="padding:10px 0;border-bottom:1px solid #262626;font-family:${SANS};font-size:15px;color:${TEXT};text-align:right">${value}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-top:2px solid ${TEXT}">${lines}</table>`;
}

export function small(html) {
  return `<p style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:#6b7280">${html}</p>`;
}

/**
 * Page complète. `preheader` est le texte d'aperçu affiché par la messagerie
 * à côté de l'objet, invisible dans le mail lui-même.
 */
export function layout({ preheader = "", body }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&family=Barlow+Condensed:wght@800;900&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<title>ZIK</title>
</head>
<body style="margin:0;padding:0;background:${BG}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
      <tr><td style="padding:0 0 18px">
        <a href="https://www.zik-music.fr" style="font-family:${CONDENSED};font-weight:900;font-size:30px;letter-spacing:1px;color:${TEXT};text-decoration:none">ZIK<span style="color:${ACCENT}">.</span></a>
      </td></tr>
      <tr><td style="height:4px;background:${ACCENT};font-size:0;line-height:0">&nbsp;</td></tr>
      <tr><td style="background:${CARD};padding:32px 28px;border:1px solid #1f1f1f;border-top:0">
        ${body}
      </td></tr>
      <tr><td style="padding:20px 4px 0">
        ${small('ZIK, le blind test en soirée sur la TV et en ligne. <a href="https://www.zik-music.fr" style="color:#a3adbd">zik-music.fr</a>')}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
