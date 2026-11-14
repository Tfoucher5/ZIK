// QG : tableau de bord 3D en direct de l'équipe d'agents ZIK.
// Usage : node scripts/qg/serveur.mjs [--port 4747] [--filtre ZIK] [--tous]
import { createServer } from "node:http";
import {
  readFileSync,
  readdirSync,
  statSync,
  openSync,
  readSync,
  closeSync,
  existsSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { Suivi, lireOrganigramme, hoteAutorise } from "./journaux.mjs";

const ici = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (nom, defaut) => {
  const i = args.indexOf(nom);
  return i >= 0 ? args[i + 1] : defaut;
};
const PORT = Number(option("--port", 4747));
const FILTRE = args.includes("--tous")
  ? ""
  : option("--filtre", "ZIK").toLowerCase();
const RACINE = join(
  process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"),
  "projects",
);
const FENETRE = 36 * 3600e3;

const suivi = new Suivi();
const positions = new Map();

function lireNouveau(fichier, agentId) {
  let taille;
  try {
    taille = statSync(fichier).size;
  } catch {
    return;
  }
  const p = positions.get(fichier) ?? { octets: 0, reste: "" };
  if (taille < p.octets) p.octets = 0;
  if (taille === p.octets) return;
  const tampon = Buffer.alloc(taille - p.octets);
  try {
    const fd = openSync(fichier, "r");
    readSync(fd, tampon, 0, tampon.length, p.octets);
    closeSync(fd);
  } catch {
    return;
  }
  p.octets = taille;
  const lignes = (p.reste + tampon.toString("utf8")).split("\n");
  p.reste = lignes.pop();
  positions.set(fichier, p);
  for (const l of lignes) {
    if (!l.trim()) continue;
    try {
      suivi.ligne(JSON.parse(l), agentId);
    } catch {
      // ligne incomplète ou d'un format inconnu : ignorée
    }
  }
}

function recent(chemin) {
  try {
    return Date.now() - statSync(chemin).mtimeMs < FENETRE;
  } catch {
    return false;
  }
}

function liste(dossier) {
  try {
    return readdirSync(dossier, { withFileTypes: true });
  } catch {
    return [];
  }
}

function balayer() {
  for (const projet of liste(RACINE)) {
    if (!projet.isDirectory() || !projet.name.toLowerCase().includes(FILTRE))
      continue;
    const dossierProjet = join(RACINE, projet.name);
    for (const f of liste(dossierProjet)) {
      const chemin = join(dossierProjet, f.name);
      if (f.isFile() && f.name.endsWith(".jsonl") && recent(chemin))
        lireNouveau(chemin, null);
      if (!f.isDirectory()) continue;
      const sousAgents = join(chemin, "subagents");
      for (const a of liste(sousAgents)) {
        if (!a.name.endsWith(".jsonl")) continue;
        const fichier = join(sousAgents, a.name);
        if (!recent(fichier)) continue;
        const agentId = basename(a.name, ".jsonl").replace(/^agent-/, "");
        const meta = join(sousAgents, `agent-${agentId}.meta.json`);
        if (existsSync(meta)) {
          try {
            suivi.meta(agentId, f.name, JSON.parse(readFileSync(meta, "utf8")));
          } catch {
            // méta en cours d'écriture : relue au prochain tour
          }
        }
        lireNouveau(fichier, agentId);
      }
    }
  }
}

function organigramme() {
  const claudeMd = join(ici, "..", "..", "CLAUDE.md");
  return existsSync(claudeMd)
    ? lireOrganigramme(readFileSync(claudeMd, "utf8"))
    : { chefs: [], board: [] };
}

const FICHIERS = {
  "/": ["index.html", "text/html"],
  "/qg.js": ["qg.js", "text/javascript"],
  "/scene.js": ["scene.js", "text/javascript"],
  "/plan.js": ["plan.js", "text/javascript"],
  "/meubles.js": ["meubles.js", "text/javascript"],
  "/chemins.js": ["chemins.js", "text/javascript"],
  "/deco.js": ["deco.js", "text/javascript"],
  "/noms.js": ["noms.js", "text/javascript"],
  "/perso.js": ["perso.js", "text/javascript"],
  "/qg.css": ["qg.css", "text/css"],
};
const clients = new Set();

createServer((req, res) => {
  if (!hoteAutorise(req.headers.host, PORT)) return res.writeHead(403).end();
  const url = req.url.split("?")[0];
  if (FICHIERS[url]) {
    const [nom, type] = FICHIERS[url];
    res.writeHead(200, {
      "content-type": `${type}; charset=utf-8`,
      "cache-control": "no-store",
    });
    res.end(readFileSync(join(ici, "public", nom)));
  } else if (url === "/organigramme") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(organigramme()));
  } else if (url === "/flux") {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify(suivi.instantane())}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
  } else {
    res.writeHead(404).end();
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(
    `QG ZIK : http://localhost:${PORT}  (journaux : ${RACINE}, filtre : ${FILTRE || "aucun"})`,
  );
});

balayer();
setInterval(() => {
  balayer();
  const donnees = `data: ${JSON.stringify(suivi.instantane())}\n\n`;
  for (const c of clients) c.write(donnees);
}, 1000);
