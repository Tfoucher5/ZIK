// Contrat GET /agents : les agents de .claude/agents/*.md avec prénom et rôle de public/noms.js, relus à chaque appel.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export function entete(texte) {
  const bloc = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const champs = {};
  for (const l of bloc.split(/\r?\n/)) {
    const m = l.match(/^(\w+): *(.*)$/);
    if (m) champs[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return champs;
}

// Équipe : « (équipe X) » de la description (premier mot), board pour chef-* et membres du board, sinon l'organigramme, sinon renforts.
function equipeDe(id, description, org) {
  const dite = description.match(/\(équipe ([^)]+)\)/i)?.[1];
  if (dite) return dite.split(/[\s&,]/)[0];
  if (id.startsWith("chef-") && id !== "chef-projet") return "board";
  if (org.board?.includes(id) || /\bboard\b/i.test(description)) return "board";
  const chef = org.chefs?.find((c) => c.equipe.includes(id));
  return chef ? chef.nom.split(/[\s&(]/)[0] : "renforts";
}

export function agentsDepuis(fiches, org, noms) {
  return fiches
    .map(({ id, texte }) => {
      const e = entete(texte);
      const perso =
        noms.EQUIPE[id] ||
        (id.startsWith("chef-") && noms.EQUIPE[id.slice(5)]) ||
        noms.fiche(id);
      return {
        id,
        nom: perso.nom,
        role: perso.role ?? id,
        equipe: equipeDe(id, e.description ?? "", org),
        model: e.model ?? null,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Le paramètre de version recharge noms.js dès qu'il change, sans redémarrer.
const importerNoms = (chemin) =>
  import(`${pathToFileURL(chemin).href}?v=${statSync(chemin).mtimeMs}`);

export async function lireAgents(racine, org, charger = importerNoms) {
  const dossier = join(racine, ".claude", "agents");
  const fiches = readdirSync(dossier)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      id: f.slice(0, -3),
      texte: readFileSync(join(dossier, f), "utf8"),
    }));
  const chemin = join(racine, "scripts", "qg", "public", "noms.js");
  const noms = await charger(chemin);
  return agentsDepuis(fiches, org, noms);
}
