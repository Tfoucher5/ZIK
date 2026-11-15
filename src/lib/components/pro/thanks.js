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

// Un abonnement se renouvelle ; une Soirée 24 h ou un accès offert s'arrête
export const endTitle = (plan) =>
  plan === "monthly" || plan === "yearly"
    ? "Prochaine échéance"
    : "Actif jusqu'au";
