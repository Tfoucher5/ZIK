/**
 * Provenance d'une inscription (« salon-invite », « salon-setup »…), rangée
 * dans user_metadata.signup_ref pour mesurer quels écrans font inscrire.
 * Gardée en localStorage : l'e-mail de confirmation et l'OAuth rouvrent le
 * site dans un autre onglet ou après une redirection.
 */
const KEY = "zik_signup_ref";
const TTL = 24 * 3600 * 1000;
// Un compte plus vieux que ça n'est pas une inscription : simple connexion
const NEW_ACCOUNT_MS = 30 * 60 * 1000;

export function rememberSignupRef(ref) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ref, ts: Date.now() }));
  } catch {
    /* stockage indisponible */
  }
}

export function signupRef() {
  try {
    const { ref, ts } = JSON.parse(localStorage.getItem(KEY));
    return Date.now() - ts < TTL ? ref : null;
  } catch {
    return null;
  }
}

export async function tagNewUser(sb, user) {
  const ref = signupRef();
  if (!ref) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible */
  }
  if (user.user_metadata?.signup_ref) return;
  if (Date.now() - new Date(user.created_at).getTime() > NEW_ACCOUNT_MS) return;
  await sb.auth.updateUser({ data: { signup_ref: ref } }).catch(() => {});
}
