// Appels amis / suivi partagés par le profil et le menu d'actions joueur.

export async function authToken(sb) {
  return (await sb?.auth.getSession())?.data?.session?.access_token ?? null;
}

async function authFetch(sb, url, init = {}) {
  const token = await authToken(sb);
  const headers = { ...init.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(url, { ...init, headers });
  return r.ok ? r.json() : null;
}

const post = (sb, url, body) =>
  authFetch(sb, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const fetchSocial = (sb, userId) =>
  authFetch(sb, `/api/social/${userId}`);

export const sendFollow = (sb, targetId) =>
  post(sb, "/api/follow", { targetId });

export const sendFriend = (sb, targetId, action) =>
  post(sb, "/api/friend", { targetId, action });

export async function fetchPlayerId(sb, username) {
  const p = await authFetch(sb, `/api/profile/${encodeURIComponent(username)}`);
  return p?.id ?? null;
}
