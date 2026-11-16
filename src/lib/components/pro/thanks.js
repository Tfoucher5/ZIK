import { PLANS } from "../../data/proPlans.js";

// État de la page /pro/merci : actif, attente trop longue, sans compte, ou attente du webhook
export function thanksPhase({ active, waitedTooLong, authReady, user }) {
  if (active) return "on";
  if (waitedTooLong) return "late";
  if (authReady && !user) return "out";
  return "wait";
}

export const STATUS = {
  wait: "Paiement en cours de confirmation",
  on: "ZIK Pro actif",
  late: "Activation plus longue que prévu",
  out: "Connexion nécessaire",
};

const PLAN_NAMES = {
  night: "Soirée 24 h",
  monthly: "Abonnement mensuel",
  yearly: "Abonnement annuel",
  manual: "Accès offert",
};

export function planLabel(plan) {
  const price = PLANS.find((p) => p.id === plan)?.price;
  return [PLAN_NAMES[plan] ?? "ZIK Pro", price].filter(Boolean).join(" · ");
}

// Paiement parti d'une régie : le texte autour du code de la soirée
export const REGIE = {
  wait: [
    "Stripe confirme votre paiement à ZIK, ça prend en général quelques secondes. Votre soirée ",
    " passera en ZIK Pro toute seule : vous pouvez déjà retourner sur votre régie.",
  ],
  on: [
    "Merci, paiement reçu. Votre soirée ",
    " vient de passer en ZIK Pro : plus de limite de joueurs, ceux qui attendaient entrent. Retournez sur votre régie, rien n'y a bougé.",
  ],
  late: [
    "Le paiement est bien passé, l'activation prend un peu plus de temps que prévu. Votre soirée ",
    " continue en attendant : retournez sur votre régie, elle passera en ZIK Pro toute seule.",
  ],
};

export const regieLine = (code, active) =>
  `${code} · ${active ? "en ZIK Pro" : "passage en cours"}`;

// Un abonnement se renouvelle ; une Soirée 24 h ou un accès offert s'arrête
export const endTitle = (plan) =>
  plan === "monthly" || plan === "yearly"
    ? "Prochaine échéance"
    : "Actif jusqu'au";
