import { json } from "@sveltejs/kit";
import { getStripe } from "$lib/server/stripe.js";
import {
  getProRow,
  activateNight,
  syncSubscription,
} from "$lib/server/services/pro.js";
import { sendMail, ADMIN_EMAIL } from "$lib/server/mail/send.js";
import { proWelcome, proSaleAlert } from "$lib/server/mail/proPurchase.js";

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
  await Promise.allSettled([
    email &&
      sendMail({
        to: email,
        ...proWelcome({ plan, periodEnd: row.current_period_end }),
      }),
    sendMail({ to: ADMIN_EMAIL, ...proSaleAlert({ email, plan }) }),
  ]);
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
      break;
  }
  return json({ received: true });
}
