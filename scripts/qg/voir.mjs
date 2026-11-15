// GET /voir?f=… : ouvre depuis le QG un fichier à relire (vidéo, image, texte, maquette), seulement sous les dossiers autorisés.
import {
  createReadStream,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { extname, resolve, sep } from "node:path";

const TYPES = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
};
// Documents qui peuvent porter du script : origine opaque, ils ne peuvent pas appeler POST /reponses.
const ACTIFS = new Set([".html", ".svg", ".md"]);

export const typeVoir = (chemin) => TYPES[extname(chemin).toLowerCase()];

const cle = (p) => (process.platform === "win32" ? p.toLowerCase() : p);
const sous = (p, racine) =>
  cle(p) === cle(racine) ||
  cle(p).startsWith(cle(racine.replace(/[\\/]$/, "") + sep));

// Chemin réel du fichier, ou null s'il sort des racines (vérifié avant et après résolution des liens).
export function cheminAutorise(f, base, racines) {
  if (typeof f !== "string" || !f || f.includes("\0")) return null;
  if (/^[\\/]{2}/.test(f) || f.split(/[\\/]/).includes("..")) return null;
  const brut = resolve(base, f);
  if (!racines.some((r) => sous(brut, resolve(r)))) return null;
  let reel;
  try {
    reel = realpathSync(brut);
    if (!statSync(reel).isFile()) return null;
  } catch {
    return null;
  }
  const reelles = racines.flatMap((r) => {
    try {
      return [realpathSync(r)];
    } catch {
      return [];
    }
  });
  return reelles.some((r) => sous(reel, r)) ? reel : null;
}

const echapper = (s) =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const pageMd = (nom, texte) =>
  `<!doctype html><meta charset="utf-8"><title>${echapper(nom)}</title>` +
  `<style>body{margin:0;background:#111;color:#eee}pre{max-width:80ch;margin:2rem auto;padding:0 1rem;` +
  `white-space:pre-wrap;font:16px/1.6 system-ui,sans-serif}</style><pre>${echapper(texte)}</pre>`;

export function servirVoir(req, res, f, { base, racines }) {
  const chemin = cheminAutorise(f, base, racines);
  if (!chemin) return res.writeHead(403).end();
  const ext = extname(chemin).toLowerCase();
  const type = TYPES[ext];
  if (!type) return res.writeHead(415).end();
  const entetes = { "content-type": type, "cache-control": "no-store" };
  if (ACTIFS.has(ext))
    entetes["content-security-policy"] = "sandbox allow-scripts";
  if (ext === ".md") {
    res.writeHead(200, entetes);
    return res.end(
      pageMd(chemin.split(/[\\/]/).pop(), readFileSync(chemin, "utf8")),
    );
  }
  const taille = statSync(chemin).size;
  entetes["accept-ranges"] = "bytes";
  const plage = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  if (req.headers.range && !plage) return res.writeHead(416).end();
  if (!plage) {
    res.writeHead(200, { ...entetes, "content-length": taille });
    return createReadStream(chemin).pipe(res);
  }
  let debut = plage[1] === "" ? taille - Number(plage[2]) : Number(plage[1]);
  let fin = plage[1] === "" || plage[2] === "" ? taille - 1 : Number(plage[2]);
  debut = Math.max(0, debut);
  fin = Math.min(fin, taille - 1);
  if (debut > fin)
    return res.writeHead(416, { "content-range": `bytes */${taille}` }).end();
  res.writeHead(206, {
    ...entetes,
    "content-length": fin - debut + 1,
    "content-range": `bytes ${debut}-${fin}/${taille}`,
  });
  createReadStream(chemin, { start: debut, end: fin }).pipe(res);
}
