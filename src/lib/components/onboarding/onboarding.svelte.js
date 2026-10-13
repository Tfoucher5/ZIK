const KEY = "zik_onboarding_done";

// Pages où on arrive pour une action précise (lien d'invitation, mot de passe) : pas d'interruption.
const SKIP_PATHS = ["/room/", "/blind-test/artiste/", "/reset-password"];

let _open = $state(false);

export const onboarding = {
  get open() {
    return _open;
  },
  start() {
    _open = true;
  },
  finish() {
    _open = false;
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* stockage indisponible */
    }
  },
};

export function shouldAutoStart(pathname) {
  if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return false;
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
}
