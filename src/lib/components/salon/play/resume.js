// Une soirée dure rarement plus longtemps : au-delà, le salon a fermé
const RESUME_MS = 12 * 60 * 60 * 1000;

// Ce téléphone jouait-il récemment dans ce salon ? Alors on lui propose de
// reprendre sa place (le serveur lui rend ses points grâce au jeton).
export function readResume(storage, urlCode, now = Date.now()) {
  const saved = storage.getItem("salon_code") || "";
  const code = urlCode || saved;
  const username = storage.getItem("salon_user") || "";
  const fresh = now - Number(storage.getItem("salon_at")) < RESUME_MS;
  const ok =
    fresh &&
    code === saved &&
    !!username &&
    !!storage.getItem("zik_salon_player_" + code);
  return {
    code: ok ? code : urlCode,
    username,
    resume: ok ? { code, username } : null,
  };
}

// « Rejoindre une autre soirée » : plus de carte de reprise pour ce salon, le
// pseudo reste pré-rempli
export function leaveResume(storage) {
  storage.removeItem("salon_at");
}

// « Ce n'est pas moi » : le téléphone oublie le joueur précédent et son jeton
export function forgetResume(storage, code) {
  storage.removeItem("zik_salon_player_" + code);
  storage.removeItem("salon_user");
}

// Après une relance automatique (écran de relance), le téléphone rejoint sans
// appui : marqueur de session lié au code, lu une seule fois
const AUTO_KEY = "salon_auto_resume";
const AUTO_MS = 2 * 60 * 1000;

export function markAutoResume(code, storage, now = Date.now()) {
  try {
    (storage ?? sessionStorage).setItem(
      AUTO_KEY,
      JSON.stringify({ code, at: now }),
    );
  } catch {
    /* stockage indisponible : carte « Re-bonjour » */
  }
}

export function takeAutoResume(code, storage, now = Date.now()) {
  try {
    const s = storage ?? sessionStorage;
    const raw = s.getItem(AUTO_KEY);
    if (!raw) return false;
    s.removeItem(AUTO_KEY);
    const m = JSON.parse(raw);
    const age = now - m?.at;
    return !!code && m?.code === code && age >= 0 && age < AUTO_MS;
  } catch {
    return false;
  }
}

// Adresse /salon/play?code=…&pseudo=… : code du QR, et formulaire envoyé avant
// que la page soit prête (réseau lent), lus par le serveur pour le premier rendu
export function joinParams(search) {
  const q = new URLSearchParams(search);
  return {
    code: (q.get("code") || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6),
    pseudo: (q.get("pseudo") || "").trim().slice(0, 20),
  };
}
