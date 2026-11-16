// Boîte aux lettres du QG : les réponses de Théo aux décisions, lues par la session Claude.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const chaine = (v, max) =>
  typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null;

export function ajouterReponses(dossier, corps, maintenant = new Date()) {
  const liste = corps?.reponses;
  if (!Array.isArray(liste) || !liste.length || liste.length > 50)
    throw new Error("réponses invalides");
  const lignes = liste.map((r) => {
    const titre = chaine(r?.titre, 300);
    const reponse = chaine(r?.reponse, 5000);
    if (!titre || !reponse) throw new Error("réponse invalide");
    return JSON.stringify({ date: maintenant.toISOString(), titre, reponse });
  });
  mkdirSync(dossier, { recursive: true });
  appendFileSync(join(dossier, "reponses.jsonl"), `${lignes.join("\n")}\n`);
  return lignes.length;
}

// Dernière réponse envoyée, par titre de décision.
export function lireReponses(dossier) {
  const fichier = join(dossier, "reponses.jsonl");
  const parTitre = new Map();
  if (!existsSync(fichier)) return parTitre;
  for (const l of readFileSync(fichier, "utf8").split("\n")) {
    try {
      const r = JSON.parse(l);
      if (r?.titre) parTitre.set(r.titre, r);
    } catch {
      // ligne vide ou coupée : ignorée
    }
  }
  return parTitre;
}

// Limites d'utilisation écrites par statusline.mjs, ou null.
export function lireLimites(dossier) {
  try {
    return JSON.parse(readFileSync(join(dossier, "limites.json"), "utf8"));
  } catch {
    return null;
  }
}
