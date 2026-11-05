import { monitorEventLoopDelay } from "node:perf_hooks";
import { totalmem } from "node:os";
import { getAdminClient } from "../../config.js";
import { salonRooms, errorLog, getIO } from "../../state.js";
import { getStripe, WEBHOOK_EVENTS } from "../../stripe.js";
import { grade } from "./levels.js";
import { mediaMissesSince } from "./mediaMisses.js";
import { countSince } from "./opsEvents.js";

// Chaque sonde rend { result: "ok" | "warn" | "fail", value, detail }.
// Aucune ne lève : une sonde qui plante compte comme un échec.

const TIMEOUT_MS = 5000;
const FIVE_MIN = 5 * 60 * 1000;
const QUARTER = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const LABELS = {
  site: "Site web",
  db: "Base de données",
  database: "Capacité de la base",
  auth: "Connexion aux comptes",
  realtime: "Temps réel (Socket.io)",
  deezer: "Deezer (extraits audio)",
  youtube: "YouTube",
  spotify: "Spotify (import de playlists)",
  stripe: "Paiements (Stripe et webhook)",
  mail: "Envoi des mails (Resend)",
  push: "Notifications sur téléphone",
  eventLoop: "Réactivité du serveur",
  memory: "Mémoire du serveur",
  errors: "Erreurs serveur",
  media: "Titres sans musique en salon",
  snapshots: "Sauvegarde des soirées",
  load: "Salons ouverts",
};

async function timed(fn) {
  const t = Date.now();
  try {
    const value = await fn();
    return { ms: Date.now() - t, value };
  } catch (e) {
    return { ms: Date.now() - t, error: e?.message ?? String(e) };
  }
}

const signal = () => AbortSignal.timeout(TIMEOUT_MS);

// Réponse lente (> 2 s) = seuil approché ; erreur ou délai dépassé = échec
async function httpProbe(
  url,
  fetchFn,
  { check, headers, accept = (res) => res.ok } = {},
) {
  const r = await timed(async () => {
    const res = await fetchFn(url, { signal: signal(), headers });
    if (!accept(res)) throw new Error(`HTTP ${res.status}`);
    if (check) check(await res.json());
    // Corps non lu : on libère la connexion sans attendre le ramasse-miettes
    else await res.body?.cancel();
  });
  if (r.error) return { result: "fail", value: r.ms, detail: r.error };
  return { result: grade(r.ms, 2000, Infinity), value: r.ms };
}

export function makeProbes({
  fetchFn = fetch,
  db = () => getAdminClient(),
  loop = monitorEventLoopDelay({ resolution: 20 }),
  memory = () => process.memoryUsage().rss,
  memoryLimit = () => process.constrainedMemory?.() || totalmem(),
  log = errorLog,
  rooms = salonRooms,
  sockets = () => getIO()?.engine?.clientsCount ?? 0,
  env = process.env,
  undelivered = (now) =>
    getStripe().events.list(
      {
        limit: 3,
        delivery_success: false,
        types: WEBHOOK_EVENTS,
        created: {
          gte: Math.floor((now - DAY) / 1000),
          lte: Math.floor((now - QUARTER) / 1000),
        },
      },
      { timeout: TIMEOUT_MS, maxNetworkRetries: 0 },
    ),
} = {}) {
  loop.enable?.();
  let lastStripe = { at: -Infinity, out: null };
  const local = `http://127.0.0.1:${env.PORT || 3000}`;
  // Clé absente : normal hors prod, à corriger en prod
  const notSet = () => ({
    result: /prod/i.test(env.RAILWAY_ENVIRONMENT_NAME ?? "") ? "warn" : "ok",
    detail: "Non configuré",
  });
  return {
    // Une vraie page rendue par le serveur. 503 : mode maintenance
    site: () =>
      httpProbe(`${local}/`, fetchFn, {
        accept: (res) => res.ok || res.status === 503,
      }),
    async db() {
      const r = await timed(async () => {
        const { error } = await db()
          .from("profiles")
          .select("id")
          .limit(1)
          .abortSignal(signal());
        if (error) throw new Error(error.message);
      });
      if (r.error) return { result: "fail", value: r.ms, detail: r.error };
      // Lente, la base répond encore : seulement au-delà du délai des autres sondes
      return { result: grade(r.ms, 1000, TIMEOUT_MS), value: r.ms };
    },
    // Plan Pro de Supabase : 8 Go de disque inclus
    async database() {
      const r = await timed(async () => {
        const { data, error } = await db().rpc("db_stats");
        if (error) throw new Error(error.message);
        return data?.[0];
      });
      if (r.error || !r.value)
        return { result: "fail", detail: r.error ?? "Aucune mesure" };
      const { size_bytes: size, connections, max_connections: max } = r.value;
      const results = [
        grade(size / 1024 ** 3, 6, 7.5),
        grade(connections / max, 0.7, 0.9),
      ];
      return {
        result: results.includes("fail")
          ? "fail"
          : results.includes("warn")
            ? "warn"
            : "ok",
        value: Math.round(size / 1048576),
        detail: `${connections} connexions sur ${max}`,
      };
    },
    auth: () =>
      httpProbe(`${env.SUPABASE_URL}/auth/v1/health`, fetchFn, {
        headers: { apikey: env.SUPABASE_ANON_KEY },
      }),
    // Une vraie poignée de main Socket.io, refermée aussitôt : sinon la session
    // resterait comptée comme une connexion pendant 45 s
    async realtime() {
      const url = `${local}/socket.io/?EIO=4&transport=polling`;
      const r = await timed(async () => {
        const res = await fetchFn(url, { signal: signal() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { sid } = JSON.parse((await res.text()).slice(1));
        if (!sid) throw new Error("Réponse Socket.io sans session");
        await fetchFn(`${url}&sid=${sid}`, {
          method: "POST",
          body: "1",
          signal: signal(),
        }).catch(() => {});
      });
      if (r.error) return { result: "fail", value: r.ms, detail: r.error };
      return { result: grade(r.ms, 1000, Infinity), value: r.ms };
    },
    deezer: () =>
      httpProbe("https://api.deezer.com/track/3135556", fetchFn, {
        // Deezer répond 200 avec { error } quand il refuse
        check: (body) => {
          if (body?.error) throw new Error(body.error.message ?? "Deezer");
        },
      }),
    // oEmbed : simple fiche publique, sans extraction de la vidéo
    youtube: () =>
      httpProbe(
        "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        fetchFn,
      ),
    // Sans jeton, l'API répond 401 : elle est là, c'est ce qu'on vérifie
    spotify: () =>
      httpProbe("https://api.spotify.com/v1/", fetchFn, {
        accept: (res) => res.status < 500,
      }),
    // Stripe sait ce qu'il n'a pas réussi à nous livrer : rien à garder en mémoire,
    // et un redémarrage ne fausse rien. Une réponse est gardée 15 min pour ménager
    // les lectures autorisées ; une erreur est retentée à chaque passage.
    async stripe(now = Date.now()) {
      if (!env.STRIPE_SECRET_KEY) return notSet();
      if (now - lastStripe.at >= QUARTER) {
        const r = await timed(() => undelivered(now));
        if (r.error) return { result: "fail", value: r.ms, detail: r.error };
        // Un événement isolé peut échouer en boucle : suspicion. Trois : panne.
        const lost = r.value?.data?.length ?? 0;
        lastStripe = {
          at: now,
          out: {
            result: grade(lost, 1, 3),
            value: r.ms,
            ...(lost && {
              detail: `Événements Stripe non livrés (webhook) : ${lost}${lost === 3 ? " ou plus" : ""}`,
            }),
          },
        };
      }
      // Information pour l'admin : n'importe qui peut envoyer une fausse signature
      const bad = countSince("stripe_bad_signature", HOUR);
      return bad && lastStripe.out.result === "ok"
        ? {
            ...lastStripe.out,
            detail: `${bad} signature${bad > 1 ? "s" : ""} refusée${bad > 1 ? "s" : ""} en 1 h`,
          }
        : lastStripe.out;
    },
    // Le quota se voit quand Resend refuse un envoi : on ne connaît pas les mails
    // envoyés par ailleurs, ceux de Supabase Auth par exemple
    async mail() {
      if (!env.RESEND_API_KEY) return notSet();
      const r = await timed(async () => {
        const res = await fetchFn("https://api.resend.com/domains", {
          signal: signal(),
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
        });
        // Trop d'appels : Resend répond, c'est ce qu'on vérifie
        if (res.status === 429) return [];
        if (res.ok) return (await res.json()).data ?? [];
        // Clé limitée à l'envoi : la liste reste fermée, sans que ce soit une panne.
        // Une clé révoquée ou invalide, elle, en est une.
        const body = await res.text();
        if (res.status === 401 && body.includes("restricted_api_key"))
          return [];
        throw new Error(`HTTP ${res.status}`);
      });
      if (r.error) return { result: "fail", value: r.ms, detail: r.error };
      const quota = countSince("mail_quota", HOUR);
      const failed = countSince("mail_failed", HOUR);
      const sent = countSince("mail_sent", DAY);
      const domain = r.value.find((d) => d.name === "zik-music.fr");
      let detail = `${sent} envoyé${sent > 1 ? "s" : ""} en 24 h`;
      let result = grade(failed, 1, 3);
      if (failed) detail += `, ${failed} en échec en 1 h`;
      if (quota) {
        result = "fail";
        detail = `Quota Resend atteint : ${quota} mail${quota > 1 ? "s" : ""} refusé${quota > 1 ? "s" : ""} en 1 h`;
      } else if (domain && domain.status !== "verified") {
        result = "fail";
        detail = `Domaine zik-music.fr : ${domain.status}`;
      }
      return { result, value: r.ms, detail };
    },
    async push() {
      if (!env.PUBLIC_VAPID_KEY || !env.VAPID_PRIVATE_KEY) return notSet();
      return { result: "ok" };
    },
    async eventLoop() {
      const ms = Math.round(loop.percentile(99) / 1e6);
      loop.reset();
      return { result: grade(ms, 100, 500), value: ms };
    },
    async memory() {
      const ratio = memory() / memoryLimit();
      return {
        result: grade(ratio, 0.7, 0.9),
        value: Math.round(memory() / 1048576),
        detail: `${Math.round(ratio * 100)} % de la mémoire`,
      };
    },
    async errors() {
      const since = Date.now() - FIVE_MIN;
      const n = log.filter((e) => e.level === "error" && e.ts > since).length;
      return {
        result: grade(n, 10, 30),
        value: n,
        detail: n
          ? log.find((e) => e.level === "error")?.msg.split("\n")[0]
          : null,
      };
    },
    async media() {
      const n = mediaMissesSince(FIVE_MIN);
      return { result: grade(n, 2, 3), value: n };
    },
    async snapshots() {
      const n = countSince("snapshot_failed", QUARTER);
      // Une sauvegarde ratée de temps en temps est retentée à la suivante
      return { result: grade(n, 2, 5), value: n };
    },
    // Information seulement : jamais en alerte
    async load() {
      const n = Object.keys(rooms).length;
      return { result: "ok", value: n, detail: `${sockets()} connexions` };
    },
  };
}
