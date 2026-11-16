// Barre d'état de Claude Code : affiche modèle et limites, et les garde dans boite/limites.json pour le QG.
// Réglage (~/.claude/settings.json) : "statusLine": { "type": "command", "command": "node <dépôt>/scripts/qg/statusline.mjs" }
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const boite = join(dirname(fileURLToPath(import.meta.url)), "boite");
let entree = "";
process.stdin.on("data", (c) => (entree += c));
process.stdin.on("end", () => {
  let d = {};
  try {
    d = JSON.parse(entree);
  } catch {
    // entrée vide : barre minimale
  }
  const rl = d.rate_limits;
  if (rl?.five_hour || rl?.seven_day) {
    try {
      mkdirSync(boite, { recursive: true });
      const tmp = join(boite, "limites.json.tmp");
      writeFileSync(tmp, JSON.stringify({ maj: Date.now(), ...rl }));
      renameSync(tmp, join(boite, "limites.json"));
    } catch {
      // le QG retombe sur son estimation
    }
  }
  const pct = (nom, w) =>
    w?.used_percentage != null && `${nom} ${Math.round(w.used_percentage)} %`;
  console.log(
    [
      d.model?.display_name,
      pct("5 h", rl?.five_hour),
      pct("semaine", rl?.seven_day),
    ]
      .filter(Boolean)
      .join(" · "),
  );
});
