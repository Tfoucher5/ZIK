// Passerelle Supabase en LECTURE SEULE pour filmer de vraies parties sans toucher la prod.
// Les lectures (GET/HEAD + quelques RPC de classement) partent vers la prod, toute écriture est avalée.
// node scripts/gateway.mjs ../../../ZIK/.env   → http://127.0.0.1:54321
// Puis lancer l'appli (worktree master) avec SUPABASE_URL=http://127.0.0.1:54321 (cf. scripts/dev-promo.sh).
import http from "node:http";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(process.argv[2] || "../../../ZIK/.env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l
        .slice(l.indexOf("=") + 1)
        .trim()
        .replace(/^"|"$/g, ""),
    ]),
);
const PROD = env.SUPABASE_URL;
const READ_RPC =
  /^(weekly_leaderboard|weekly_leaderboard_by_room|zikle_leaderboard|leaderboard_score|leaderboard_score_my_rank|get_covers_by_playlists|cards_showcase|cards_leaderboard|cards_leaderboard_my_rank)$/;

http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Expose-Headers", "*");
    if (req.method === "OPTIONS") return res.end();
    const chunks = [];
    for await (const c of req) chunks.push(c);

    if (req.url.startsWith("/auth/v1/user")) {
      res.writeHead(401, { "content-type": "application/json" });
      return res.end('{"msg":"no session"}');
    }
    let rpc = req.url.match(/^\/rest\/v1\/rpc\/([a-z_]+)/)?.[1];
    // pick_daily_song peut créer la chanson du jour : on la remplace par une lecture de celle du jour (heure de Paris,
    // la base contient déjà celle du lendemain)
    if (rpc === "pick_daily_song") {
      req.method = "GET";
      req.url = `/rest/v1/daily_songs?select=date,track_id&date=eq.${new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" })}`;
      rpc = undefined;
    }
    const read =
      ["GET", "HEAD"].includes(req.method) || (rpc && READ_RPC.test(rpc));
    if (!read || !/^\/(rest|storage)\/v1\//.test(req.url)) {
      console.log("BLOQUÉ", req.method, req.url.slice(0, 90));
      // Réponse vide plausible : tableau pour PostgREST, objet sinon
      res.writeHead(req.method === "POST" ? 201 : 200, {
        "content-type": "application/json",
      });
      return res.end(req.url.startsWith("/rest/v1/") && !rpc ? "[]" : "null");
    }

    const headers = { ...req.headers };
    for (const h of ["host", "connection", "accept-encoding", "content-length"])
      delete headers[h];
    const r = await fetch(PROD + req.url, {
      method: req.method,
      headers,
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : Buffer.concat(chunks),
    });
    const out = {};
    r.headers.forEach((v, k) => {
      if (
        ![
          "content-encoding",
          "content-length",
          "transfer-encoding",
          "connection",
        ].includes(k)
      )
        out[k] = v;
    });
    res.writeHead(r.status, out);
    res.end(Buffer.from(await r.arrayBuffer()));
  })
  .listen(54321, "127.0.0.1", () =>
    console.log("Passerelle lecture seule : http://127.0.0.1:54321"),
  );
