// Tableau de bord SVG de la couverture : jauges, barres par zone, évolution.
// Clair ou sombre selon le thème de GitHub (media query dans le SVG).

const L = 860;
const MESURES = [
  ["lines", "Lignes"],
  ["statements", "Instructions"],
  ["functions", "Fonctions"],
  ["branches", "Branches"],
];
const VERT = "#2ea043";
const ORANGE = "#d29922";
const ROUGE = "#e5534b";

const virgule = (n, d = 1) => n.toFixed(d).replace(".", ",");
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot" }[c]};`,
  );

// Zones : 70 % et plus vert, 50 à 70 % orange, en dessous rouge
export const teinteZone = (p) => (p >= 70 ? VERT : p >= 50 ? ORANGE : ROUGE);
// Mesures globales : rouge sous le seuil de la CI, sinon mêmes paliers que les zones
export const teinteSeuil = (p, seuil) => (p < seuil ? ROUGE : teinteZone(p));

function jauge(x, y, valeur, seuil, nom, ecart, versus) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const t = teinteSeuil(valeur, seuil);
  const angle = (seuil / 100) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  const tick = (d) => `${x + Math.cos(rad) * d},${y + Math.sin(rad) * d}`;
  const delta =
    ecart == null || Math.abs(ecart) < 0.05
      ? ""
      : `<text x="${x}" y="${y + 98}" class="petit" fill="${ecart > 0 ? VERT : ROUGE}" text-anchor="middle">${ecart > 0 ? "▲ +" : "▼ "}${virgule(ecart)} pt vs ${esc(versus)}</text>`;
  return `<g>
<circle cx="${x}" cy="${y}" r="${r}" class="piste" stroke-width="12" fill="none"/>
<circle cx="${x}" cy="${y}" r="${r}" stroke="${t}" stroke-width="12" fill="none" stroke-linecap="round"
  stroke-dasharray="${(c * Math.min(valeur, 100)) / 100} ${c}" transform="rotate(-90 ${x} ${y})"/>
<polyline points="${tick(r - 9)} ${tick(r + 9)}" class="trait" stroke-width="3"/>
<text x="${x}" y="${y + 7}" class="valeur" text-anchor="middle">${virgule(valeur)}<tspan class="unite"> %</tspan></text>
<text x="${x}" y="${y + 66}" class="nom" text-anchor="middle">${nom}</text>
<text x="${x}" y="${y + 82}" class="petit" text-anchor="middle">seuil ${seuil} %</text>
${delta}</g>`;
}

function zones(liste, y0) {
  const x0 = 190;
  const w = 470;
  const h = 26;
  const lignes = liste.map((z, i) => {
    const y = y0 + 34 + i * h;
    return `<text x="24" y="${y + 13}" class="zone">${esc(z.nom)}</text>
<rect x="${x0}" y="${y + 2}" width="${w}" height="14" rx="7" class="piste-plein"/>
<rect x="${x0}" y="${y + 2}" width="${Math.max(4, (w * z.pct) / 100)}" height="14" rx="7" fill="${teinteZone(z.pct)}"/>
<text x="${x0 + w + 14}" y="${y + 14}" class="chiffre">${virgule(z.pct)} %</text>
<text x="${L - 24}" y="${y + 14}" class="petit" text-anchor="end">${z.covered} / ${z.total} lignes</text>`;
  });
  const bas = y0 + 34 + liste.length * h;
  const repere = (p) =>
    `<line x1="${x0 + (w * p) / 100}" x2="${x0 + (w * p) / 100}" y1="${y0 + 30}" y2="${bas}" class="repere"/>
<text x="${x0 + (w * p) / 100}" y="${y0 + 26}" class="petit" text-anchor="middle">${p} %</text>`;
  return {
    svg: `<text x="24" y="${y0 + 14}" class="titre2">Par zone : lignes couvertes, de la moins à la mieux testée</text>
${repere(50)}${repere(70)}
${lignes.join("\n")}`,
    bas,
  };
}

function evolution(historique, seuil, y0) {
  const h = 120;
  const x0 = 60;
  const w = L - x0 - 30;
  const pts = historique.slice(-40);
  const titre = `<text x="24" y="${y0 + 14}" class="titre2">Évolution des lignes couvertes sur develop</text>`;
  if (pts.length < 2)
    return `${titre}<text x="${L / 2}" y="${y0 + 80}" class="petit" text-anchor="middle">La courbe apparaîtra après quelques fusions dans develop.</text>`;
  const vals = pts.map((p) => p.lines);
  const min = Math.max(0, Math.floor(Math.min(seuil, ...vals) / 10) * 10 - 10);
  const max = Math.min(100, Math.ceil(Math.max(...vals) / 10) * 10 + 5);
  const X = (i) => x0 + (w * i) / (pts.length - 1);
  const Y = (v) => y0 + 30 + h - (h * (v - min)) / (max - min);
  const ligne = pts.map((p, i) => `${X(i)},${Y(p.lines)}`).join(" ");
  const aire = `${X(0)},${Y(min)} ${ligne} ${X(pts.length - 1)},${Y(min)}`;
  const graduations = [min, Math.round((min + max) / 2), max]
    .map(
      (v) =>
        `<line x1="${x0}" x2="${x0 + w}" y1="${Y(v)}" y2="${Y(v)}" class="grille"/><text x="${x0 - 8}" y="${Y(v) + 4}" class="petit" text-anchor="end">${v} %</text>`,
    )
    .join("");
  const dernier = pts.at(-1);
  return `${titre}${graduations}
<line x1="${x0}" x2="${x0 + w}" y1="${Y(seuil)}" y2="${Y(seuil)}" stroke="${ROUGE}" stroke-dasharray="6 4" stroke-width="1.5"/>
<text x="${x0 + w}" y="${Y(seuil) - 6}" class="petit" fill="${ROUGE}" text-anchor="end">seuil ${seuil} %</text>
<polygon points="${aire}" fill="url(#degrade)"/>
<polyline points="${ligne}" fill="none" stroke="#a371f7" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="${X(pts.length - 1)}" cy="${Y(dernier.lines)}" r="5" fill="#a371f7"/>
<text x="${x0}" y="${y0 + h + 52}" class="petit">${esc(pts[0].date)}</text>
<text x="${x0 + w}" y="${y0 + h + 52}" class="petit" text-anchor="end">${esc(dernier.date)}</text>`;
}

export function graphique({
  resume,
  zones: liste,
  base,
  seuils,
  historique = [],
  legende,
  versus = "develop",
}) {
  const t = resume.total;
  const ref = base?.total;
  const jauges = MESURES.map(([cle, nom], i) =>
    jauge(
      120 + i * 207,
      140,
      t[cle].pct,
      seuils[cle],
      nom,
      ref ? t[cle].pct - ref[cle].pct : null,
      versus,
    ),
  ).join("\n");
  const z = zones(liste, 270);
  const haut = z.bas + 230;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${haut}" viewBox="0 0 ${L} ${haut}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" role="img" aria-label="Couverture des tests du serveur : ${virgule(t.lines.pct)} % des lignes">
<style>
.fond{fill:#ffffff}.titre{fill:#1f2328;font-size:20px;font-weight:700}.titre2{fill:#1f2328;font-size:14px;font-weight:600}
.valeur{fill:#1f2328;font-size:22px;font-weight:700}.unite{font-size:13px;font-weight:600}.nom{fill:#1f2328;font-size:14px;font-weight:600}
.petit{fill:#656d76;font-size:11px}.zone{fill:#1f2328;font-size:12px;font-family:ui-monospace,Consolas,monospace}
.chiffre{fill:#1f2328;font-size:12px;font-weight:700}.piste{stroke:#eaeef2}.piste-plein{fill:#eaeef2}.trait{stroke:#1f2328}
.repere{stroke:#8c959f;stroke-dasharray:3 3}.grille{stroke:#eaeef2}.bord{fill:none;stroke:#d0d7de}
@media (prefers-color-scheme: dark){.fond{fill:#0d1117}.titre,.titre2,.valeur,.nom,.zone,.chiffre{fill:#e6edf3}.petit{fill:#8d96a0}
.piste{stroke:#21262d}.piste-plein{fill:#21262d}.trait{stroke:#e6edf3}.repere{stroke:#6e7681}.grille{stroke:#21262d}.bord{stroke:#30363d}}
</style>
<defs><linearGradient id="degrade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a371f7" stop-opacity=".35"/><stop offset="1" stop-color="#a371f7" stop-opacity="0"/></linearGradient></defs>
<rect width="${L}" height="${haut}" rx="12" class="fond"/><rect x=".5" y=".5" width="${L - 1}" height="${haut - 1}" rx="12" class="bord"/>
<text x="24" y="38" class="titre">Couverture des tests <tspan fill="#ff2bd6">·</tspan> serveur de jeu et services</text>
<text x="${L - 24}" y="38" class="petit" text-anchor="end">${esc(legende ?? "")}</text>
${jauges}
${z.svg}
${evolution(historique, seuils.lines, z.bas + 30)}
</svg>
`;
}
