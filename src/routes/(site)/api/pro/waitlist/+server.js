import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { sendMail, ADMIN_EMAIL } from "$lib/server/mail/send.js";
import {
  waitlistWelcome,
  waitlistAdminAlert,
} from "$lib/server/mail/proWaitlist.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VENUE_TYPES = ["bar", "camping", "association", "entreprise", "autre"];
const PLAN_IDS = ["night", "monthly", "yearly"];
// 5 inscriptions par heure et par adresse : assez pour un humain, pas pour un script
const MAX_PER_HOUR = 5;
const recent = new Map();

function tooMany(ip) {
  if (recent.size > 5000) recent.clear();
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 3600_000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > MAX_PER_HOUR;
}

// Lieux intéressés par ZIK Pro avant l'ouverture du paiement
export async function POST({ request, getClientAddress }) {
  if (tooMany(getClientAddress()))
    return json(
      { error: "Trop d'envois, réessaie plus tard." },
      { status: 429 },
    );
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corps invalide" }, { status: 400 });
  }
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
  if (!EMAIL_RE.test(email))
    return json({ error: "Adresse e-mail invalide." }, { status: 400 });

  const row = {
    email,
    venue:
      String(body.venue ?? "")
        .trim()
        .slice(0, 120) || null,
    venue_type: VENUE_TYPES.includes(body.venueType) ? body.venueType : null,
    plan: PLAN_IDS.includes(body.plan) ? body.plan : null,
  };
  const sb = getAdminClient();
  const { error } = await sb.from("pro_waitlist").insert(row);
  if (error)
    return json(
      { error: "Inscription impossible, réessaie." },
      { status: 500 },
    );

  // Confirmation au lieu et alerte à Théo. Un mail raté ne fait pas échouer
  // l'inscription, déjà enregistrée.
  const { count } = await sb
    .from("pro_waitlist")
    .select("*", { count: "exact", head: true });
  const results = await Promise.allSettled([
    sendMail({ to: email, ...waitlistWelcome(row) }),
    sendMail({
      to: ADMIN_EMAIL,
      ...waitlistAdminAlert({
        email,
        venue: row.venue,
        venueType: row.venue_type,
        plan: row.plan,
        total: count ?? 1,
      }),
    }),
  ]);
  const mailed = results[0].status === "fulfilled" && results[0].value;
  return json({ ok: true, mailed });
}
