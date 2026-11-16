import { FREE_MAX_TEAMS } from "../data/proPlans.js";
import {
  SALON_ROUNDS,
  SALON_DURATIONS,
  SALON_REVEALS,
} from "../data/salonOptions.js";

// Clé de régie d'un salon, gardée par le navigateur qui l'a créé : l'écran TV
// et la régie ouverts sur ce navigateur n'ont pas besoin de la redemander.
const k = (code) => `zik_salon_key_${code}`;
const LAST = "zik_salon_last";
// Une soirée dure rarement plus : au-delà, on ne propose plus d'y revenir
const LAST_MAX_MS = 12 * 60 * 60 * 1000;

export function saveSalonKey(code, key) {
  try {
    localStorage.setItem(k(code), key);
    localStorage.setItem(LAST, JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* stockage indisponible */
  }
}

// Dernière soirée créée sur ce navigateur, si l'hôte peut encore y revenir
export function lastSalon(now = Date.now()) {
  try {
    const { code, at } = JSON.parse(localStorage.getItem(LAST) ?? "null") ?? {};
    return code && now - at < LAST_MAX_MS && salonKey(code) ? code : null;
  } catch {
    return null;
  }
}

// Dernière soirée, seulement si le serveur la dit encore ouverte ; fermée,
// elle est oubliée. Réseau en panne : rien n'est affiché, rien n'est oublié.
export async function openLastSalon(fetchFn = fetch) {
  const code = lastSalon();
  if (!code) return null;
  const res = await fetchFn(`/api/salon?code=${code}`).catch(() => null);
  if (res?.status === 404) forgetSalon(code);
  return res?.ok ? code : null;
}

// Dernière préparation de soirée (playlists et réglages) : un habitué relance en un clic
const SETUP = "zik_salon_setup";

export function saveSetup(playlistIds, settings) {
  try {
    localStorage.setItem(SETUP, JSON.stringify({ playlistIds, settings }));
  } catch {
    /* stockage indisponible */
  }
}

// Réglages connus et du bon type ; la page filtre les playlists encore proposées
export function readSetup(defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(SETUP) ?? "null");
    if (!saved || typeof saved !== "object") return null;
    const playlistIds = Array.isArray(saved.playlistIds)
      ? saved.playlistIds
      : [];
    const settings = {};
    for (const [key, value] of Object.entries(defaults))
      if (typeof saved.settings?.[key] === typeof value)
        settings[key] = saved.settings[key];
    return { playlistIds, settings };
  } catch {
    return null;
  }
}

const ALLOWED = {
  maxRounds: SALON_ROUNDS,
  roundDuration: SALON_DURATIONS,
  showAnswerDuration: SALON_REVEALS,
  answerMode: ["free", "multiple", "buzzer"],
};

// Réglages repris pour cet hôte : une valeur hors des choix proposés, ou que l'offre
// gratuite n'ouvre pas (buzzer, manches spéciales, équipes en plus), retombe sur le défaut.
// Le serveur ferait la même chose sans prévenir : l'hôte verrait un mode qu'il n'aura pas.
export function setupFor(saved, pro, defaults) {
  const s = { ...defaults, ...saved };
  for (const [key, values] of Object.entries(ALLOWED))
    if (!values.includes(s[key])) s[key] = defaults[key];
  if (!pro) {
    if (s.answerMode === "buzzer") s.answerMode = defaults.answerMode;
    s.specials = defaults.specials;
    s.teamCount = Math.min(s.teamCount, FREE_MAX_TEAMS);
  }
  return s;
}

export function forgetSalon(code) {
  try {
    if (lastSalon() === code) localStorage.removeItem(LAST);
  } catch {
    /* stockage indisponible */
  }
}

export function salonKey(code) {
  try {
    return localStorage.getItem(k(code));
  } catch {
    return null;
  }
}

// Clé passée dans l'URL : on la garde puis on la retire de la barre d'adresse
export function takeSalonKeyFromUrl(code) {
  const url = new URL(window.location.href);
  const key = url.searchParams.get("key");
  if (key) {
    saveSalonKey(code, key);
    url.searchParams.delete("key");
    history.replaceState(null, "", url);
  }
  return key ?? salonKey(code);
}

// Changement de playlist : compte de l'hôte si connecté, sinon clé de régie
export async function patchSalonPlaylists(sb, code, playlistIds) {
  const {
    data: { session },
  } = await sb.auth.getSession();
  const headers = { "content-type": "application/json" };
  if (session) headers.Authorization = `Bearer ${session.access_token}`;
  const res = await fetch("/api/salon", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ code, playlistIds, key: salonKey(code) }),
  });
  const d = await res.json();
  if (!res.ok)
    throw new Error(d.error || "Le changement n'a pas pu se faire. Réessaie.");
  return d;
}

// Abonnement ZIK Pro du compte connecté (lecture de sa propre ligne, RLS)
export async function fetchPro(sb, userId) {
  if (!userId) return null;
  const { data } = await sb
    .schema("salon")
    .from("pro_subscriptions")
    .select(
      "plan, status, current_period_end, stripe_customer_id, stripe_last_session",
    )
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export const proActive = (row) =>
  row?.status === "active" && new Date(row.current_period_end) > new Date();

// Paiement ou espace client : le serveur crée la page Stripe, on y part
export async function goToStripe(sb, path, body = {}) {
  const {
    data: { session },
  } = await sb.auth.getSession();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.url)
    throw new Error(
      d.error || d.message || "Stripe ne répond pas, réessaie dans un instant.",
    );
  window.location.href = d.url;
}

// QR code qui ouvre la page joueur du salon
export const salonQrUrl = (code, size) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent("https://www.zik-music.fr/salon/play?code=" + code)}&bgcolor=ffffff&color=000000`;
