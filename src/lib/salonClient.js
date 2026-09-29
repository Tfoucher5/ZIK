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
export async function fetchIsPro(sb, userId) {
  if (!userId) return false;
  const { data } = await sb
    .from("pro_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return (
    data?.status === "active" && new Date(data.current_period_end) > new Date()
  );
}
