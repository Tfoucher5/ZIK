// Appels de l'outil de diagnostic audio de l'admin.

// POST sur /api/admin/<path> : renvoie les données, ou lève le message à afficher
export async function post(path, token, body, failure) {
  let res;
  let d;
  try {
    res = await fetch(`/api/admin/${path}?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    d = await res.json();
  } catch {
    throw new Error("Le serveur est injoignable.");
  }
  if (res.status === 403)
    throw new Error("Session expirée — recharge la page.");
  if (!res.ok) throw new Error(d.error || failure);
  return d;
}

export function duree(s) {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
