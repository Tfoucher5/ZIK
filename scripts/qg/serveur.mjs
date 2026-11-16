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
import { homedir, tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { Suivi, lireOrganigramme, hoteAutorise } from "./journaux.mjs";
import { lireATrancher, lireChantiers } from "./trancher.mjs";
import { lireAgents } from "./agents.mjs";
import { ajouterReponses, lireReponses, lireLimites } from "./boite.mjs";
import { servirVoir } from "./voir.mjs";

const ici = dirname(fileURLToPath(import.meta.url));
const DEPOT = join(ici, "..", "..");
const BOITE = join(ici, "boite");
const VOIR = {
  base: DEPOT,
  racines: [
    DEPOT,
    join(homedir(), "Documents", "GitHub", "ZIK-memes"),
    join(tmpdir(), "claude"),
  ],
};
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
  const claudeMd = join(DEPOT, "CLAUDE.md");
  return existsSync(claudeMd)
    ? lireOrganigramme(readFileSync(claudeMd, "utf8"))
    : { chefs: [], board: [] };
}

const doc = (nom) => {
  const chemin = join(DEPOT, "docs", "strategie", nom);
  return existsSync(chemin) ? readFileSync(chemin, "utf8") : "";
};
const json = (res, donnees) => {
  res.writeHead(200, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(donnees));
};

const TYPES = { html: "text/html", js: "text/javascript", css: "text/css" };
const fichier = (url) => {
  const nom = url === "/" ? "index.html" : url.slice(1);
  return /^(tour\/(niveaux\/)?)?[a-z0-9-]+\.(html|js|css)$/.test(nom) &&
    existsSync(join(ici, "public", nom))
    ? nom
    : null;
};
const clients = new Set();

createServer((req, res) => {
  if (!hoteAutorise(req.headers.host, PORT)) return res.writeHead(403).end();
  const url = req.url.split("?")[0];
  const nom = fichier(url);
  if (nom) {
    res.writeHead(200, {
      "content-type": `${TYPES[nom.split(".").pop()]}; charset=utf-8`,
      "cache-control": "no-store",
    });
    res.end(readFileSync(join(ici, "public", nom)));
  } else if (url === "/voir") {
    if (
      !/^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress)
    )
      return res.writeHead(403).end();
    servirVoir(
      req,
      res,
      new URL(req.url, "http://l").searchParams.get("f"),
      VOIR,
    );
  } else if (url === "/organigramme") {
    json(res, organigramme());
  } else if (url === "/agents") {
    lireAgents(DEPOT, organigramme()).then(
      (a) => json(res, a),
      () => res.writeHead(500).end(),
    );
  } else if (url === "/a-trancher") {
    const envoyees = lireReponses(BOITE);
    json(
      res,
      lireATrancher(doc("a-trancher.md")).map((d) => {
        const r = envoyees.get(d.titre);
        return r ? { ...d, envoye: r.date, reponse: r.reponse } : d;
      }),
    );
  } else if (url === "/chantiers") {
    json(res, lireChantiers(doc("chantiers.md")));
  } else if (url === "/limites") {
    json(res, lireLimites(BOITE));
  } else if (url === "/reponses" && req.method === "POST") {
    if (!hoteAutorise(req.headers.origin?.replace(/^http:\/\//, ""), PORT))
      return res.writeHead(403).end();
    let corps = "";
    req.on("data", (c) => {
      corps += c;
      if (corps.length > 300e3) req.destroy();
    });
    req.on("end", () => {
      try {
        json(res, { n: ajouterReponses(BOITE, JSON.parse(corps)) });
      } catch {
        res.writeHead(400).end();
      }
    });
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
