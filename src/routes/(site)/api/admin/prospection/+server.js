import { json } from "@sveltejs/kit";
import { requireAdminToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";

const STATUSES = [
  "new",
  "sent",
  "followed_up",
  "replied",
  "interested",
  "unsubscribed",
  "bounced",
];
const DAYS = 30;

// Suivi de la prospection : entonnoir, envois par jour, réponses, clients
export async function GET({ url }) {
  await requireAdminToken(url.searchParams.get("token"));
  const sb = getAdminClient();

  const counts = await Promise.all(
    STATUSES.map((s) =>
      sb
        .from("prospects")
        .select("*", { count: "exact", head: true })
        .eq("status", s),
    ),
  );
  if (counts[0].error)
    return json(
      { error: "Table prospects absente : appliquer 20261003_prospects.sql." },
      { status: 503 },
    );

  const since = new Date(Date.now() - DAYS * 86400_000).toISOString();
  const [{ data: recent }, { data: replies }, { data: pro }] =
    await Promise.all([
      sb
        .from("prospects")
        .select("kind, first_sent_at, followup_sent_at")
        .or(`first_sent_at.gte.${since},followup_sent_at.gte.${since}`)
        .limit(5000),
      sb
        .from("prospect_replies")
        .select(
          "id, received_at, from_email, subject, excerpt, category, summary, suggested_reply, handled, prospects(name, kind, city, email)",
        )
        .or("category.is.null,category.neq.bounce")
        .order("received_at", { ascending: false })
        .limit(100),
      sb.from("pro_subscriptions").select("user_id, plan, created_at"),
    ]);

  const perDay = {};
  for (const p of recent ?? []) {
    for (const [field, key] of [
      ["first_sent_at", "contacts"],
      ["followup_sent_at", "relances"],
    ]) {
      if (!p[field] || p[field] < since) continue;
      const d = p[field].slice(0, 10);
      perDay[d] ??= { contacts: 0, relances: 0 };
      perDay[d][key]++;
    }
  }

  // Clients ZIK Pro dont l'e-mail de compte figure dans les prospects contactés
  const clients = [];
  for (const s of pro ?? []) {
    const { data } = await sb.auth.admin.getUserById(s.user_id);
    const email = data?.user?.email?.toLowerCase();
    if (!email) continue;
    const { data: hit } = await sb
      .from("prospects")
      .select("name, kind, city, first_sent_at")
      .eq("email", email)
      .not("first_sent_at", "is", null)
      .maybeSingle();
    if (hit) clients.push({ ...hit, email, plan: s.plan, since: s.created_at });
  }

  return json({
    funnel: Object.fromEntries(
      STATUSES.map((s, i) => [s, counts[i].count ?? 0]),
    ),
    perDay: Object.entries(perDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day, ...v })),
    replies: replies ?? [],
    clients,
  });
}

// Marquer une réponse comme traitée (ou non)
export async function PATCH({ request }) {
  const { token, id, handled } = await request.json();
  await requireAdminToken(token);
  const { error } = await getAdminClient()
    .from("prospect_replies")
    .update({ handled: !!handled })
    .eq("id", id);
  if (error) return json({ error: error.message }, { status: 500 });
  return json({ ok: true });
}
