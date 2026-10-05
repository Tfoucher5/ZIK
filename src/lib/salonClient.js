// Clé de régie d'un salon, gardée par le navigateur qui l'a créé : l'écran TV
// et la régie ouverts sur ce navigateur n'ont pas besoin de la redemander.
const k = (code) => `zik_salon_key_${code}`;

export function saveSalonKey(code, key) {
  try {
    localStorage.setItem(k(code), key);
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
  if (!res.ok) throw new Error(d.error || "Changement impossible");
  return d;
}

// Abonnement ZIK Pro du compte connecté (lecture de sa propre ligne, RLS)
export async function fetchPro(sb, userId) {
  if (!userId) return null;
  const { data } = await sb
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
      d.error ||
        d.message ||
        "Stripe ne répond pas, réessayez dans un instant.",
    );
  window.location.href = d.url;
}
