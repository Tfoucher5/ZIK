// Contexte joint à chaque signalement : sans lui, un « ça marche pas » ne dit
// ni où, ni sur quel appareil, ni ce qui venait de planter.

const MAX_ERRORS = 8;
const recentErrors = [];

function pushError(msg) {
  recentErrors.unshift({
    at: new Date().toISOString(),
    msg: String(msg).slice(0, 300),
  });
  recentErrors.length = Math.min(recentErrors.length, MAX_ERRORS);
}

export function watchClientErrors() {
  if (typeof window === "undefined" || window.__zikErrorsWatched) return;
  window.__zikErrorsWatched = true;
  window.addEventListener("error", (e) =>
    pushError(
      e.message
        ? `${e.message} (${e.filename?.split("/").pop() ?? "?"}:${e.lineno ?? "?"})`
        : "Ressource introuvable",
    ),
  );
  window.addEventListener("unhandledrejection", (e) =>
    pushError(e.reason?.message ?? e.reason ?? "Promesse rejetée"),
  );
}

function audioState() {
  const audios = [...document.querySelectorAll("audio, video")];
  if (!audios.length) return null;
  return audios.map((a) => ({
    kind: a.tagName.toLowerCase(),
    paused: a.paused,
    muted: a.muted,
    volume: Math.round(a.volume * 100),
    position: Math.round(a.currentTime),
    ready: a.readyState,
    error: a.error?.code ?? null,
    source: a.currentSrc ? new URL(a.currentSrc).host : null,
  }));
}

export function collectReportContext(extra = {}) {
  if (typeof window === "undefined") return {};
  const nav = navigator;
  return {
    page: location.pathname + location.search,
    from: document.referrer || null,
    at: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: nav.language,
    userAgent: nav.userAgent,
    viewport: `${innerWidth}×${innerHeight}`,
    screen: `${screen.width}×${screen.height} @${devicePixelRatio}x`,
    touch: nav.maxTouchPoints > 0,
    online: nav.onLine,
    network: nav.connection?.effectiveType ?? null,
    visible: document.visibilityState,
    audio: audioState(),
    errors: recentErrors.slice(),
    ...extra,
  };
}
