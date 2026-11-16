import { PLANS } from "../../data/proPlans.js";

// Formule et soirée choisies sur /pro, gardées le temps de créer un compte,
// confirmer l'e-mail ou revenir de Google et de Stripe
export const INTENT_KEY = "zik_pro_intent";
const TTL = 3600_000;
const CODE = /^[A-Z0-9]{4,12}$/;

const plan = (p) => (PLANS.some((x) => x.id === p) ? p : null);
const salon = (s) => (typeof s === "string" && CODE.test(s) ? s : null);

export function loadIntent(storage, now = Date.now()) {
  try {
    const it = JSON.parse(storage.getItem(INTENT_KEY));
    if (!it || !(now - it.at < TTL)) return null;
    const v = { plan: plan(it.plan), salon: salon(it.salon) };
    return v.plan || v.salon ? v : null;
  } catch {
    return null;
  }
}

export function saveIntent(storage, it, now = Date.now()) {
  try {
    storage.setItem(
      INTENT_KEY,
      JSON.stringify({ plan: it.plan, salon: it.salon, at: now }),
    );
  } catch {
    /* stockage indisponible */
  }
}

export function forgetIntent(storage) {
  try {
    storage.removeItem(INTENT_KEY);
  } catch {
    /* stockage indisponible */
  }
}

// Arrivée par la régie (?formule=night&salon=CODE) ou retour sur /pro.
// La clé de régie ne voyage jamais dans l'URL : sans elle sur ce navigateur,
// pas de soirée rattachable.
export function readIntent(search, storage, keyOf, now = Date.now()) {
  const q = new URLSearchParams(search);
  const it = q.has("salon")
    ? { plan: plan(q.get("formule")), salon: salon(q.get("salon")) }
    : loadIntent(storage, now);
  if (!it) return null;
  if (it.salon === null) return q.has("salon") ? null : it;
  if (!keyOf(it.salon)) return null;
  if (q.has("salon")) saveIntent(storage, it, now);
  return it;
}

// Étape du bloc « Depuis votre régie »
export function stepOf({ user, plan, pendingEmail, activated }) {
  if (activated) return "actif";
  if (!plan) return "formule";
  if (!user) return pendingEmail ? "mail" : "compte";
  return "payer";
}

// L'onglet a été ouvert par la régie : on le ferme, sinon on y va ici
export function backToRegie(code, win = window) {
  win.close();
  setTimeout(
    () => win.location.assign(`/salon/regie?code=${encodeURIComponent(code)}`),
    300,
  );
}
