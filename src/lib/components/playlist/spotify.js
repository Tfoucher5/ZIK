// Connexion Spotify (PKCE) pour l'import de playlists, réservé à l'admin.
const REDIRECT_PATH = "/playlists";

export function getSpotifyToken() {
  const t = sessionStorage.getItem("sp_token");
  const exp = parseInt(sessionStorage.getItem("sp_token_exp") || "0");
  return t && Date.now() < exp ? t : null;
}

export function clearSpotifyToken() {
  sessionStorage.removeItem("sp_token");
  sessionStorage.removeItem("sp_token_exp");
}

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function connectSpotify(clientId) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(64)));
  const challenge = b64url(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
  );
  sessionStorage.setItem("sp_verifier", verifier);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope:
      "playlist-read-private playlist-read-collaborative user-read-private",
    redirect_uri: window.location.origin + REDIRECT_PATH,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state: "sp_import",
  });
  window.location.href = "https://accounts.spotify.com/authorize?" + params;
}

// Retour de Spotify sur /playlists?code=... : échange du code contre un jeton.
export async function handleSpotifyCallback(clientId) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (params.get("error") || !code || params.get("state") !== "sp_import") {
    if (params.get("error")) history.replaceState({}, "", REDIRECT_PATH);
    return false;
  }
  history.replaceState({}, "", REDIRECT_PATH);
  const verifier = sessionStorage.getItem("sp_verifier");
  if (!verifier || !clientId) return false;
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: window.location.origin + REDIRECT_PATH,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  const json = await r.json();
  if (!json.access_token)
    throw new Error(json.error_description || "Échange du jeton refusé");
  sessionStorage.setItem("sp_token", json.access_token);
  sessionStorage.setItem("sp_token_exp", Date.now() + json.expires_in * 1000);
  sessionStorage.removeItem("sp_verifier");
  return true;
}
