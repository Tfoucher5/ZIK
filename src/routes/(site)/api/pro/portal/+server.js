import { json } from "@sveltejs/kit";
import { requireAuth } from "$lib/server/middleware/auth.js";
import { getStripe } from "$lib/server/stripe.js";
import { getProRow } from "$lib/server/services/pro.js";

// Espace client Stripe : factures, carte bancaire, résiliation
export async function POST({ request, url }) {
  const { user } = await requireAuth(request);
  const row = await getProRow(user.id);
  if (!row?.stripe_customer_id)
    return json({ error: "Aucun paiement sur ce compte." }, { status: 404 });
  const session = await getStripe().billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    locale: "fr",
    return_url: `${url.origin}/pro#tarifs`,
  });
  return json({ url: session.url });
}
