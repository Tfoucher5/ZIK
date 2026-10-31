import { getAdminClient } from "../../config.js";
import { sendMail, ADMIN_EMAIL } from "../../mail/send.js";
import { proSupportLaunch } from "../../mail/proSupport.js";
import { proSoireeLaunch } from "../../mail/proSoiree.js";
import { firstTime } from "../notify/push.js";

// Mails aux clients Pro, du plus récent au plus ancien. La clé garde la trace
// des envois : chaque client ne reçoit un mail donné qu'une fois.
export const CAMPAIGNS = [
  {
    id: "pro-soiree",
    label: "v3.21 · Soirée, buzzer, podium final",
    build: proSoireeLaunch,
  },
  {
    id: "pro-support",
    label: "v3.15 · Support en direct",
    build: proSupportLaunch,
  },
];

export const campaign = (id) => CAMPAIGNS.find((c) => c.id === id) ?? null;
const key = (c, userId) => `mail:${c.id}:${userId}`;

async function recipients(c, scope) {
  const sb = getAdminClient();
  let q = sb.from("pro_subscriptions").select("user_id, current_period_end");
  if (scope === "active")
    q = q
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString());
  const { data } = await q;
  const ids = [...new Set((data ?? []).map((s) => s.user_id))];
  const { data: sent } = ids.length
    ? await sb
        .from("notification_once")
        .select("key")
        .in(
          "key",
          ids.map((id) => key(c, id)),
        )
    : { data: [] };
  const done = new Set((sent ?? []).map((r) => r.key));
  const users = await Promise.all(
    ids.map((id) => sb.auth.admin.getUserById(id).then((r) => r.data?.user)),
  );
  return users
    .filter((u) => u?.email)
    .map((u) => ({ id: u.id, email: u.email, sent: done.has(key(c, u.id)) }));
}

export async function proMailingStatus() {
  const count = (list) => ({
    total: list.length,
    pending: list.filter((r) => !r.sent).length,
  });
  return Promise.all(
    CAMPAIGNS.map(async (c) => {
      const [active, all] = await Promise.all([
        recipients(c, "active"),
        recipients(c, "all"),
      ]);
      return {
        id: c.id,
        label: c.label,
        subject: c.build().subject,
        active: count(active),
        all: count(all),
      };
    }),
  );
}

export const sendProMailingTest = (c) =>
  sendMail({ to: ADMIN_EMAIL, ...c.build() });

// Relancer l'envoi ne renvoie rien à ceux qui l'ont déjà reçu
export async function sendProMailing(c, scope) {
  const mail = c.build();
  let sent = 0;
  for (const r of await recipients(c, scope)) {
    if (r.sent || !(await firstTime(key(c, r.id)))) continue;
    if (await sendMail({ to: r.email, ...mail })) sent++;
  }
  return sent;
}
