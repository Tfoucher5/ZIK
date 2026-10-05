import { json } from "@sveltejs/kit";
import { requireAuth, checkRateLimit } from "$lib/server/middleware/auth.js";
import { getStripe, priceFor } from "$lib/server/stripe.js";
import { getProRow, isProActive } from "$lib/server/services/pro.js";

// Ouvre une page de paiement Stripe pour la formule choisie
export async function POST({ request, url, getClientAddress }) {
  checkRateLimit(`checkout:${getClientAddress()}`, 10, 60_000);
  const { user } = await requireAuth(request);
  const { plan, confirm } = await request.json().catch(() => ({}));
  const price = priceFor(plan);
  if (!price) return json({ error: "Formule inconnue." }, { status: 400 });

  const row = await getProRow(user.id);
  const subscribed =
    row?.stripe_subscription_id &&
    row.status !== "canceled" &&
    new Date(row.current_period_end) > new Date();
  if (subscribed)
    return json(
      { error: "Vous avez déjà un abonnement : gérez-le depuis cette page." },
      { status: 409 },
    );
  // Accès déjà actif (passe Soirée, accès offert) : on ne repaie qu'après
  // une confirmation explicite, pour éviter un double paiement par erreur
  if (isProActive(row) && confirm !== true)
    return json(
      {
        error: "ZIK Pro est déjà actif sur votre compte.",
        activeUntil: row.current_period_end,
      },
      { status: 409 },
    );

  const isNight = plan === "night";
  const metadata = { user_id: user.id, plan };
  const session = await getStripe().checkout.sessions.create({
    mode: isNight ? "payment" : "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    metadata,
    ...(row?.stripe_customer_id
      ? {
          customer: row.stripe_customer_id,
          customer_update: { name: "auto", address: "auto" },
        }
      : { customer_email: user.email }),
    ...(isNight
      ? {
          invoice_creation: { enabled: true, invoice_data: { metadata } },
          ...(row?.stripe_customer_id ? {} : { customer_creation: "always" }),
        }
      : { subscription_data: { metadata } }),
    tax_id_collection: { enabled: true },
    allow_promotion_codes: true,
    locale: "fr",
    custom_text: {
      submit: {
        message:
          "En payant, vous acceptez les CGV (www.zik-music.fr/cgv) et demandez l'activation immédiate de ZIK Pro.",
      },
    },
    success_url: `${url.origin}/pro/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${url.origin}/pro#tarifs`,
  });
  return json({ url: session.url });
}
