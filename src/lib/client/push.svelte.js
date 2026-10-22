import { env } from "$env/dynamic/public";

// Abonnement de cet appareil aux notifications (Web Push). Le service worker
// (src/service-worker.js) est enregistré automatiquement par SvelteKit.

export const push = $state({
  supported: false,
  // iPhone/iPad dans Safari : il faut d'abord ajouter ZIK à l'écran d'accueil
  needsInstall: false,
  permission: "default",
  subscribed: false,
  busy: false,
});

function base64ToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function send(method, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch("/api/push/subscription", {
    method,
    headers,
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("Abonnement refusé");
}

/** État initial ; si l'appareil est déjà abonné, le rattache au joueur connecté. */
export async function initPush(getToken) {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  push.supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!env.PUBLIC_VAPID_KEY;
  push.needsInstall = ios && !standalone && !push.supported;
  if (!push.supported) return;
  push.permission = Notification.permission;
  const sub = await currentSubscription();
  push.subscribed = !!sub && push.permission === "granted";
  const token = await getToken();
  if (push.subscribed && token)
    send("POST", sub.toJSON(), token).catch(() => {});
}

export async function enablePush(getToken) {
  if (!push.supported || push.busy) return;
  push.busy = true;
  try {
    push.permission = await Notification.requestPermission();
    if (push.permission !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(env.PUBLIC_VAPID_KEY),
      }));
    await send("POST", sub.toJSON(), await getToken());
    push.subscribed = true;
  } finally {
    push.busy = false;
  }
}

export async function disablePush() {
  if (!push.supported || push.busy) return;
  push.busy = true;
  try {
    const sub = await currentSubscription();
    if (sub) {
      await send("DELETE", { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe();
    }
    push.subscribed = false;
  } finally {
    push.busy = false;
  }
}

/** Déconnexion : l'appareil n'est plus rattaché à ce compte. */
export async function forgetPushOwner() {
  if (!push.supported) return;
  const sub = await currentSubscription();
  if (sub) await send("DELETE", { endpoint: sub.endpoint }).catch(() => {});
}
