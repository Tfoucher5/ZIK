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
