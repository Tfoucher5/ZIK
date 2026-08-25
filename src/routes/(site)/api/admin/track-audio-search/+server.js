import { error, json } from "@sveltejs/kit";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";

async function checkAdmin(token) {
  if (!token) throw error(403, "Token manquant");
  const user = await verifyToken(token);
  if (!user) throw error(403, "Token invalide");
  const { data: profile } = await getAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") throw error(403, "Accès refusé");
}

async function chercherDeezer(q) {
  const res = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=8`,
    { signal: AbortSignal.timeout(6000) },
  );
  if (!res.ok) throw new Error(`Deezer HTTP ${res.status}`);
  const data = await res.json();
  return (data.data ?? [])
    .filter((t) => t.preview)
    .map((t) => ({
      source: "deezer",
      externalId: String(t.id),
      title: t.title_short || t.title,
      artist: t.artist?.name ?? "",
      album: t.album?.title ?? "",
      cover: t.album?.cover_small ?? null,
      duration: t.duration ?? null,
      previewUrl: t.preview,
    }));
}

async function chercherItunes(q) {
  const res = await fetch(
    `https://itunes.apple.com/search?media=music&limit=8&term=${encodeURIComponent(q)}`,
    { signal: AbortSignal.timeout(6000) },
  );
  if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
  const data = await res.json();
  return (data.results ?? [])
    .filter((t) => t.previewUrl)
    .map((t) => ({
      source: "itunes",
      // iTunes n'alimente pas external_id, réservé aux identifiants Deezer.
      externalId: null,
      title: t.trackName ?? "",
      artist: t.artistName ?? "",
      album: t.collectionName ?? "",
      cover: t.artworkUrl100 ?? null,
      duration: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : null,
      previewUrl: t.previewUrl,
    }));
}

// Propose des extraits écoutables pour remplacer la source d'un titre.
// N'écrit rien : le choix et l'enregistrement restent des actes explicites.
export async function POST({ url, request }) {
  await checkAdmin(url.searchParams.get("token"));

  const { query } = await request.json();
  const q = (query ?? "").trim();
  if (!q) return json({ error: "Recherche vide" }, { status: 400 });

  const erreurs = [];
  let resultats = [];

  try {
    resultats = await chercherDeezer(q);
  } catch (e) {
    erreurs.push(`Deezer : ${e.message}`);
  }

  // iTunes complète la liste, et prend le relais si Deezer est indisponible.
  try {
    resultats = [...resultats, ...(await chercherItunes(q))];
  } catch (e) {
    erreurs.push(`iTunes : ${e.message}`);
  }

  return json({ results: resultats, errors: erreurs });
}
