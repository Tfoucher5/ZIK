import { getAdminClient } from "$lib/server/config.js";
import { getStripe } from "$lib/server/stripe.js";

const TTL = 5 * 60_000;
let cache = null;

async function stripeCharges() {
  if (cache && cache.exp > Date.now()) return cache.data;
  const since = new Date();
  since.setMonth(since.getMonth() - 5, 1);
  since.setHours(0, 0, 0, 0);
  const charges = [];
  for await (const c of getStripe().charges.list({
    limit: 100,
    created: { gte: Math.floor(since.getTime() / 1000) },
  })) {
    charges.push({
      id: c.id,
      amount: c.amount,
      refunded: c.amount_refunded,
      status: c.status,
      created: c.created * 1000,
      email: c.billing_details?.email ?? c.receipt_email ?? null,
      customer: typeof c.customer === "string" ? c.customer : c.customer?.id,
      failure: c.failure_message,
      live: c.livemode,
    });
    if (charges.length >= 500) break;
  }
  cache = { data: charges, exp: Date.now() + TTL };
  return charges;
}

export async function load({ url }) {
  if (url.searchParams.has("refresh")) cache = null;
  const sb = getAdminClient();
  const { data: subs } = await sb
    .from("pro_subscriptions")
    .select(
      "user_id, plan, status, current_period_end, stripe_customer_id, created_at",
    )
    .order("current_period_end", { ascending: false });

  const ids = (subs ?? []).map((s) => s.user_id);
  const { data: profs } = ids.length
    ? await sb.from("profiles").select("id, username").in("id", ids)
    : { data: [] };
  const name = Object.fromEntries((profs ?? []).map((p) => [p.id, p.username]));

  let charges = [];
  let stripeError = null;
  try {
    charges = await stripeCharges();
  } catch (e) {
    stripeError = e.message;
  }

  return {
    subs: (subs ?? []).map((s) => ({ ...s, username: name[s.user_id] ?? "?" })),
    charges,
    stripeError,
  };
}
