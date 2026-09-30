import Stripe from "stripe";

let client;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error("STRIPE_SECRET_KEY manquante");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// Formule ZIK Pro -> prix Stripe (créés dans le Dashboard, un jeu test et un jeu live)
export function priceFor(plan) {
  return {
    night: process.env.STRIPE_PRICE_NIGHT,
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    yearly: process.env.STRIPE_PRICE_YEARLY,
  }[plan];
}

export function planForPrice(priceId) {
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return "yearly";
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  return null;
}
