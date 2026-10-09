import { getAdminClient } from "../config.js";
import { sendMail, ADMIN_EMAIL } from "../mail/send.js";
import { proSupportLaunch } from "../mail/proSupport.js";
import { firstTime } from "./push.js";

const KEY = "mail:pro-support";

async function recipients(scope) {
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
          ids.map((id) => `${KEY}:${id}`),
        )
    : { data: [] };
  const done = new Set((sent ?? []).map((r) => r.key));
  const users = await Promise.all(
    ids.map((id) => sb.auth.admin.getUserById(id).then((r) => r.data?.user)),
  );
  return users
    .filter((u) => u?.email)
    .map((u) => ({
      id: u.id,
      email: u.email,
      sent: done.has(`${KEY}:${u.id}`),
    }));
}

export async function proMailingStatus() {
  const [active, all] = await Promise.all([
    recipients("active"),
    recipients("all"),
  ]);
  const count = (list) => ({
    total: list.length,
    pending: list.filter((r) => !r.sent).length,
  });
  return { active: count(active), all: count(all) };
}

export const sendProMailingTest = () =>
  sendMail({ to: ADMIN_EMAIL, ...proSupportLaunch() });

// Chaque client ne reçoit le mail qu'une fois, même si on relance l'envoi
export async function sendProMailing(scope) {
  const mail = proSupportLaunch();
  let sent = 0;
  for (const r of await recipients(scope)) {
    if (r.sent || !(await firstTime(`${KEY}:${r.id}`))) continue;
    if (await sendMail({ to: r.email, ...mail })) sent++;
  }
  return sent;
}
