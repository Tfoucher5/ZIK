import { getAdminClient } from "../config.js";
import { planForPrice } from "../stripe.js";

const NIGHT_MS = 24 * 3600_000;

export async function getProRow(userId) {
  const { data } = await getAdminClient()
    .from("pro_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export const isProActive = (row) =>
  row?.status === "active" && new Date(row.current_period_end) > new Date();

// Abonnement ZIK Pro en cours pour ce compte (payé ou donné par l'admin)
export async function isPro(userId) {
  if (!userId) return false;
  return isProActive(await getProRow(userId));
}

// Passe Soirée : 24 h, ajoutées à la suite d'un passe encore en cours
export async function activateNight(userId, customerId, sessionId) {
  const row = await getProRow(userId);
  const from =
    isProActive(row) && row.plan === "night"
      ? new Date(row.current_period_end).getTime()
      : Date.now();
  await getAdminClient()
    .from("pro_subscriptions")
    .upsert({
      user_id: userId,
      plan: "night",
      status: "active",
      current_period_end: new Date(from + NIGHT_MS).toISOString(),
      stripe_customer_id: customerId,
      stripe_subscription_id: null,
      stripe_last_session: sessionId,
      updated_at: new Date().toISOString(),
    });
}

const STATUS = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  unpaid: "past_due",
};

// Recopie un abonnement Stripe (mensuel ou annuel) dans pro_subscriptions
export async function syncSubscription(sub, sessionId) {
  const userId = sub.metadata?.user_id;
  if (!userId) return null;
  const item = sub.items.data[0];
  const plan = planForPrice(item?.price?.id);
  if (!plan) return null;
  const status = STATUS[sub.status] ?? "canceled";
  // Un vieil abonnement qui se termine n'écrase pas un accès plus récent
  if (status !== "active") {
    const current = await getProRow(userId);
    if (current && current.stripe_subscription_id !== sub.id) return null;
  }
  const row = {
    user_id: userId,
    plan,
    status,
    current_period_end: new Date(item.current_period_end * 1000).toISOString(),
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    updated_at: new Date().toISOString(),
    ...(sessionId ? { stripe_last_session: sessionId } : {}),
  };
  await getAdminClient().from("pro_subscriptions").upsert(row);
  return row;
}
