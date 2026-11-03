import { monitorEventLoopDelay } from "node:perf_hooks";
import { totalmem } from "node:os";
import { getAdminClient } from "../../config.js";
import { salonRooms, errorLog, getIO } from "../../state.js";
import { grade } from "./levels.js";
import { mediaMissesSince } from "./mediaMisses.js";

// Chaque sonde rend { result: "ok" | "warn" | "fail", value, detail }.
// Aucune ne lève : une sonde qui plante compte comme un échec.

const TIMEOUT_MS = 5000;
const FIVE_MIN = 5 * 60 * 1000;

export const LABELS = {
  db: "Base de données",
  deezer: "Deezer (extraits audio)",
  youtube: "YouTube",
  eventLoop: "Réactivité du serveur",
  memory: "Mémoire du serveur",
  errors: "Erreurs serveur",
  media: "Titres sans musique en salon",
  load: "Salons ouverts",
};

async function timed(fn) {
  const t = Date.now();
  try {
    await fn();
    return { ms: Date.now() - t };
  } catch (e) {
    return { ms: Date.now() - t, error: e?.message ?? String(e) };
  }
}

// Réponse lente (> 2 s) = seuil approché ; erreur ou délai dépassé = échec
async function httpProbe(url, fetchFn, check) {
  const r = await timed(async () => {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (check) check(await res.json());
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
} = {}) {
  loop.enable?.();
  return {
    async db() {
      const r = await timed(async () => {
        const { error } = await db().from("profiles").select("id").limit(1);
        if (error) throw new Error(error.message);
      });
      if (r.error) return { result: "fail", value: r.ms, detail: r.error };
      return { result: grade(r.ms, 1000, 3000), value: r.ms };
    },
    deezer: () =>
      httpProbe("https://api.deezer.com/track/3135556", fetchFn, (body) => {
        // Deezer répond 200 avec { error } quand il refuse
        if (body?.error) throw new Error(body.error.message ?? "Deezer");
      }),
    // oEmbed : simple fiche publique, sans extraction de la vidéo
    youtube: () =>
      httpProbe(
        "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        fetchFn,
      ),
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
    // Information seulement : jamais en alerte
    async load() {
      const n = Object.keys(rooms).length;
      return { result: "ok", value: n, detail: `${sockets()} connexions` };
    },
  };
}
