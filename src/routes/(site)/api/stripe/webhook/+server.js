import { json } from "@sveltejs/kit";
import { getStripe } from "$lib/server/stripe.js";
import {
  getProRow,
  activateNight,
  syncSubscription,
} from "$lib/server/services/pro.js";
import { sendMail, ADMIN_EMAIL } from "$lib/server/mail/send.js";
import { proWelcome, proSaleAlert } from "$lib/server/mail/proPurchase.js";
import { alertAdminsSafe } from "$lib/server/services/adminAlerts.js";
import { PLAN_LABELS } from "$lib/admin/players.js";

async function onCheckoutCompleted(session) {
  const userId = session.client_reference_id;
  if (!userId || session.payment_status !== "paid") return;
  if ((await getProRow(userId))?.stripe_last_session === session.id) return;

  const plan = session.metadata?.plan;
  if (session.mode === "payment") {
    await activateNight(userId, session.customer, session.id);
  } else {
    const sub = await getStripe().subscriptions.retrieve(session.subscription);
    await syncSubscription(sub, session.id);
  }

  const row = await getProRow(userId);
  const email = session.customer_details?.email;
  alertAdminsSafe("admin_money", {
    title: `Nouveau Pro : ${PLAN_LABELS[plan] ?? plan ?? "?"}`,
    body: `${email ?? "Un joueur"} · ${((session.amount_total ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: (session.currency ?? "eur").toUpperCase() })}`,
    url: `/admin/users/${userId}`,
    tag: `pro:${session.id}`,
  });
  await Promise.allSettled([
    email &&
      sendMail({
        to: email,
        ...proWelcome({ plan, periodEnd: row.current_period_end }),
      }),
    sendMail({ to: ADMIN_EMAIL, ...proSaleAlert({ email, plan }) }),
  ]);
}

function alertOnSubscriptionChange(event) {
  const sub = event.data.object;
  const before = event.data.previous_attributes ?? {};
  const userId = sub.metadata?.user_id;
  const url = userId ? `/admin/users/${userId}` : "/admin/argent";
  if (event.type === "customer.subscription.deleted")
    alertAdminsSafe("admin_money", {
      title: "Abonnement Pro terminé",
      body: "Un abonné Pro est parti.",
      url,
      tag: `sub:${sub.id}:end`,
    });
  else if (sub.cancel_at_period_end && before.cancel_at_period_end === false)
    alertAdminsSafe("admin_money", {
      title: "Résiliation Pro programmée",
      body: "Un abonné a demandé à ne pas renouveler.",
      url,
      tag: `sub:${sub.id}:cancel`,
    });
  else if (
    sub.status === "past_due" &&
    before.status &&
    before.status !== "past_due"
  )
    alertAdminsSafe("admin_money", {
      title: "Paiement Pro refusé",
      body: "Le renouvellement d'un abonné a échoué.",
      url,
      tag: `sub:${sub.id}:past_due`,
    });
}

// Stripe prévient ZIK des paiements, renouvellements et résiliations
export async function POST({ request }) {
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature"),
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("[stripe] signature refusée :", err.message);
    return json({ error: "Signature invalide" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      alertOnSubscriptionChange(event);
      break;
  }
  return json({ received: true });
}
