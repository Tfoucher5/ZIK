import Stripe from "stripe";

// Événements traités par /api/stripe/webhook, surveillés par la sonde Stripe
export const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

let client;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error("STRIPE_SECRET_KEY manquante");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// Formule ZIK Pro -> prix Stripe (créés dans le Dashboard, un jeu test et un jeu live)
export function priceFor(plan) {
  const prices = {
    night: process.env.STRIPE_PRICE_NIGHT,
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    yearly: process.env.STRIPE_PRICE_YEARLY,
  };
  // « constructor », « toString »… : hérités, ce ne sont pas des formules
  return Object.hasOwn(prices, plan) ? prices[plan] : undefined;
}

export function planForPrice(priceId) {
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return "yearly";
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  return null;
}
