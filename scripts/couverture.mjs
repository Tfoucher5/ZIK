// Couverture des tests, sans service tiers : rapport Markdown (résumé du run et
// commentaire de PR) et badge SVG publié sur la branche `couverture`.
//
// Usage : node scripts/couverture.mjs markdown <résumé> [<résumé de develop>]
//         node scripts/couverture.mjs badge <résumé> > badge.svg
// <résumé> : coverage/coverage-summary.json (reporter json-summary de vitest)

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MESURES = [
  ["lines", "Lignes"],
  ["statements", "Instructions"],
  ["functions", "Fonctions"],
  ["branches", "Branches"],
];

const lire = (chemin) => {
  try {
    return JSON.parse(readFileSync(chemin, "utf8"));
  } catch {
    return null;
  }
};

const virgule = (n, d = 1) => n.toFixed(d).replace(".", ",");
const pct = (n) => `${virgule(n)} %`;
export const barre = (p) => {
  const plein = Math.round(Math.max(0, Math.min(100, p)) / 10);
  return "▰".repeat(plein) + "▱".repeat(10 - plein);
};

// Seuils de vitest.config.js : sous le seuil, la CI échoue ; juste au-dessus, on surveille
export function etat(p, seuil) {
  if (p < seuil) return "❌";
  if (p < seuil + 5) return "⚠️";
  return "✅";
}

// Zones sans seuil : repère pour savoir où écrire des tests
export const pastille = (p) => (p >= 70 ? "🟢" : p >= 50 ? "🟡" : "🔴");

// src/lib/server/socket/salon/x.js → « socket/salon » ; services/music/x.js → « services/music »
export function zone(fichier) {
  const m = fichier.replace(/\\/g, "/").match(/src\/lib\/server\/(.+)$/);
  if (!m) return null;
  const parts = m[1].split("/");
  return parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
}

export function parZone(resume) {
  const zones = {};
  for (const [fichier, m] of Object.entries(resume)) {
    const z = fichier !== "total" && zone(fichier);
    if (!z) continue;
    zones[z] ??= { covered: 0, total: 0, fichiers: 0 };
    zones[z].covered += m.lines.covered;
    zones[z].total += m.lines.total;
    zones[z].fichiers++;
  }
  return Object.entries(zones)
    .filter(([, v]) => v.total > 0)
    .map(([nom, v]) => ({ nom, ...v, pct: (100 * v.covered) / v.total }))
    .sort((a, b) => a.pct - b.pct);
}

const ecart = (v, b) => {
  if (b == null) return "";
  const e = v - b;
  if (Math.abs(e) < 0.05) return "=";
  return e > 0 ? `📈 +${virgule(e)}` : `📉 ${virgule(e)}`;
};

export function markdown(resume, base, seuils) {
  const { total } = resume;
  const ref = base?.total ?? null;
  const etats = MESURES.map(([cle]) => etat(total[cle].pct, seuils[cle]));
  const titre = etats.includes("❌")
    ? "❌ Couverture sous le seuil : la CI refuse la fusion"
    : etats.includes("⚠️")
      ? "⚠️ Couverture tout juste au-dessus du seuil"
      : "✅ Couverture au-dessus du seuil";
  const recul = ref && MESURES.some(([c]) => total[c].pct < ref[c].pct - 0.05);

  const mesures = MESURES.map(
    ([cle, nom], i) =>
      `| ${etats[i]} ${nom} | \`${barre(total[cle].pct)}\` **${pct(total[cle].pct)}** | ${seuils[cle]} % | ${ecart(total[cle].pct, ref?.[cle].pct)} |`,
  );
  const zones = parZone(resume).map(
    (z) =>
      `| ${pastille(z.pct)} \`${z.nom}\` | \`${barre(z.pct)}\` ${pct(z.pct)} | ${z.covered} / ${z.total} | ${z.fichiers} |`,
  );

  return [
    `## ${titre}`,
    "",
    recul
      ? "📉 **En baisse par rapport à develop** : du code a été ajouté sans test, ou des tests ont été retirés."
      : ref
        ? "Pas de baisse par rapport à develop."
        : "_Pas encore de mesure de référence sur develop._",
    "",
    "| Mesure | Couverture | Seuil | Écart avec develop |",
    "| --- | --- | ---: | ---: |",
    ...mesures,
    "",
    "<details><summary>Détail par zone (lignes couvertes, de la moins à la mieux testée)</summary>",
    "",
    "| Zone | Couverture | Lignes | Fichiers |",
    "| --- | --- | ---: | ---: |",
    ...zones,
    "",
    "🟢 70 % et plus · 🟡 50 à 70 % · 🔴 moins de 50 %. Mesuré sur le serveur de jeu (`socket/`) et les services.",
    "</details>",
    "",
  ].join("\n");
}

export function couleur(p) {
  if (p >= 80) return "#3fb950";
  if (p >= 60) return "#a3c93a";
  if (p >= 45) return "#d29922";
  return "#e5534b";
}

export function badge(total) {
  const p = total.lines.pct;
  const texte = `${Math.round(p)} %`;
  const g = 126;
  const d = 12 + texte.length * 7;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${g + d}" height="20" role="img" aria-label="couverture serveur : ${texte}">
<title>couverture serveur : ${texte}</title>
<rect width="${g}" height="20" fill="#555"/><rect x="${g}" width="${d}" height="20" fill="${couleur(p)}"/>
<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
<text x="${g / 2}" y="14">couverture serveur</text><text x="${g + d / 2}" y="14">${texte}</text>
</g></svg>
`;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [mode, chemin, cheminBase] = process.argv.slice(2);
  const resume = lire(chemin);
  if (!resume?.total) {
    console.error(`Résumé de couverture illisible : ${chemin}`);
    process.exit(1);
  }
  if (mode === "badge") process.stdout.write(badge(resume.total));
  else {
    const { default: config } = await import("../vitest.config.js");
    const seuils = config.test.coverage.thresholds;
    process.stdout.write(
      markdown(resume, cheminBase ? lire(cheminBase) : null, seuils),
    );
  }
}
