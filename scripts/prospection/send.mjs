// Mails de prospection du jour depuis theo@zik-music.fr : relances dues, puis
// premiers contacts. Par défaut, affiche seulement ce qui partirait.
// Usage : node scripts/prospection/send.mjs          (aperçu)
//         node scripts/prospection/send.mjs --send   (envoi réel)
import MailComposer from "nodemailer/lib/mail-composer";
import { db, smtp, imap, sleep, FROM_EMAIL } from "./lib.mjs";
import { firstMail, followUp } from "./templates.mjs";

const SEND = process.argv.includes("--send");
const FOLLOWUP_AFTER_DAYS = 7;
const DAY = 86400_000;

// Montée en charge : un domaine qui écrit d'un coup à beaucoup d'inconnus
// finit en spam. 10 par jour la 1re semaine, 20 la 2e, puis 30.
function dailyQuota(firstEverSend) {
  if (!firstEverSend) return 10;
  const days = (Date.now() - new Date(firstEverSend).getTime()) / DAY;
  return days < 7 ? 10 : days < 14 ? 20 : 30;
}

// Les campings préparent leur saison de janvier à avril
const kindsNow = () =>
  new Date().getMonth() <= 3
    ? ["bar", "association", "camping"]
    : ["bar", "association"];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const day = new Date().getDay();
if (SEND && (day === 0 || day === 6)) {
  console.log("Week-end : aucun envoi.");
  process.exit(0);
}

const sb = db();

const { data: firstRow } = await sb
  .from("prospects")
  .select("first_sent_at")
  .not("first_sent_at", "is", null)
  .order("first_sent_at")
  .limit(1)
  .maybeSingle();
const quota = dailyQuota(firstRow?.first_sent_at);

const { data: dueFollowUps } = await sb
  .from("prospects")
  .select("*")
  .eq("status", "sent")
  .is("followup_sent_at", null)
  .lt(
    "first_sent_at",
    new Date(Date.now() - FOLLOWUP_AFTER_DAYS * DAY).toISOString(),
  )
  .limit(quota);

const { data: fresh } = await sb
  .from("prospects")
  .select("*")
  .eq("status", "new")
  .in("kind", kindsNow())
  .limit(1000);
const newOnes = shuffle(fresh ?? []).slice(0, quota);

const jobs = [
  ...(dueFollowUps ?? []).map((p) => ({ p, followup: true })),
  ...newOnes.map((p) => ({ p, followup: false })),
];
console.log(
  `Quota ${quota} : ${dueFollowUps?.length ?? 0} relance(s), ${newOnes.length} premier(s) contact(s)${SEND ? "" : " - APERÇU, rien n'est envoyé"}`,
);

if (!SEND) {
  for (const { p, followup } of jobs)
    console.log(
      `- ${followup ? "relance" : "contact"} [${p.kind}] ${p.name}${p.city ? `, ${p.city}` : ""} <${p.email}>`,
    );
  if (jobs[0]) {
    const sample = jobs[0].followup
      ? followUp(jobs[0].p)
      : firstMail(jobs[0].p);
    console.log(
      `\n--- Exemple ---\nObjet : ${sample.subject}\n\n${sample.text}`,
    );
  }
  process.exit(0);
}

const transport = smtp();
const box = await imap();
const sentFolder =
  (await box.list()).find((f) => f.specialUse === "\\Sent")?.path ?? "Sent";

let sent = 0;
for (const { p, followup } of jobs) {
  const mail = followup ? followUp(p) : firstMail(p);
  const raw = await new MailComposer({
    from: { name: "Théo de ZIK", address: FROM_EMAIL },
    to: p.email,
    subject: mail.subject,
    text: mail.text,
    headers: { "List-Unsubscribe": `<mailto:${FROM_EMAIL}?subject=stop>` },
    ...(followup && p.message_id
      ? { inReplyTo: p.message_id, references: [p.message_id] }
      : {}),
  })
    .compile()
    .build();
  const messageId = raw.toString().match(/^Message-ID:\s*(<[^>]+>)/im)?.[1];

  try {
    await transport.sendMail({
      envelope: { from: FROM_EMAIL, to: p.email },
      raw,
    });
  } catch (err) {
    console.error(
      `Échec prospect ${p.id} : ${err.responseCode ?? err.code ?? "erreur"}`,
    );
    if (err.responseCode >= 500)
      await sb.from("prospects").update({ status: "bounced" }).eq("id", p.id);
    continue;
  }
  await box.append(sentFolder, raw, ["\\Seen"]);

  const now = new Date().toISOString();
  await sb
    .from("prospects")
    .update(
      followup
        ? { status: "followed_up", followup_sent_at: now }
        : { status: "sent", first_sent_at: now, message_id: messageId },
    )
    .eq("id", p.id);
  sent++;
  console.log(`OK ${followup ? "relance" : "contact"} prospect ${p.id}`);
  await sleep(8000 + Math.random() * 12000);
}

await box.logout();
console.log(`Terminé : ${sent} mail(s) envoyé(s)`);
