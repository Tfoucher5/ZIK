// Lit la boîte IONOS : réponses des lieux contactés, « stop » et adresses
// invalides. Le tri des réponses est fait ensuite par la routine Claude.
// Usage : node scripts/prospection/inbox.mjs
import { simpleParser } from "mailparser";
import { db, FROM_EMAIL, imap } from "./lib.mjs";

const LOOKBACK_DAYS = 5;
const STOP_RE =
  /^\s*(stop|d[ée]sinscri|unsubscribe|ne plus (me )?(contacter|[ée]crire))/i;
const QUOTE_START =
  /^(le .+ a [ée]crit|on .+ wrote|-{2,}\s*(message|original)|de\s*:|from\s*:)/i;

function ownText(text = "") {
  const lines = [];
  for (const line of text.split(/\r?\n/)) {
    if (QUOTE_START.test(line.trim())) break;
    if (!line.startsWith(">")) lines.push(line);
  }
  return lines.join("\n").trim().slice(0, 2000);
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const norm = (s = "") =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

let contacted = null;

// Expéditeur générique (contact@, plateforme de réservation, transfert) : le
// lieu se retrouve par son adresse ou son nom cité dans le mail
async function prospectFromContent(sb, mail, from) {
  const text = `${mail.subject ?? ""}\n${mail.text ?? ""}`;
  const emails = [...new Set(text.toLowerCase().match(EMAIL_RE) ?? [])].filter(
    (e) => e !== from && e !== FROM_EMAIL,
  );
  if (emails.length) {
    const { data } = await sb
      .from("prospects")
      .select("id, status")
      .in("email", emails)
      .neq("status", "new");
    if (data?.length === 1) return data[0];
  }

  contacted ??=
    (await sb.from("prospects").select("id, status, name").neq("status", "new"))
      .data ?? [];
  const haystack = norm(text);
  const hits = contacted.filter(
    (p) => p.name.length >= 6 && haystack.includes(norm(p.name)),
  );
  return hits.length === 1 ? hits[0] : null;
}

const sb = db();
const box = await imap();
const lock = await box.getMailboxLock("INBOX");
let added = 0;
try {
  const uids = await box.search(
    { since: new Date(Date.now() - LOOKBACK_DAYS * 86400_000) },
    { uid: true },
  );
  for (const uid of uids ?? []) {
    const { source } = await box.fetchOne(uid, { source: true }, { uid: true });
    const mail = await simpleParser(source);
    const messageId = mail.messageId;
    const from = mail.from?.value?.[0]?.address?.toLowerCase();
    if (!messageId || !from) continue;

    const { data: known } = await sb
      .from("prospect_replies")
      .select("id")
      .eq("message_id", messageId)
      .maybeSingle();
    if (known) continue;

    const received_at = (mail.date ?? new Date()).toISOString();

    // Adresse invalide : le serveur renvoie le mail avec l'adresse en erreur
    if (/mailer-daemon|postmaster/i.test(from)) {
      const emails = [
        ...new Set((mail.text ?? "").toLowerCase().match(EMAIL_RE) ?? []),
      ];
      const { data: hits } = await sb
        .from("prospects")
        .select("id")
        .in("email", emails);
      for (const hit of hits ?? []) {
        await sb
          .from("prospects")
          .update({ status: "bounced" })
          .eq("id", hit.id);
        await sb.from("prospect_replies").insert({
          prospect_id: hit.id,
          message_id: `${messageId}#${hit.id}`,
          received_at,
          from_email: from,
          subject: mail.subject,
          category: "bounce",
          handled: true,
        });
        added++;
      }
      continue;
    }

    // Le lieu peut répondre depuis une autre adresse : on suit le fil d'abord
    const refs = [mail.inReplyTo, ...[].concat(mail.references ?? [])].filter(
      Boolean,
    );
    let prospect = null;
    if (refs.length) {
      const { data } = await sb
        .from("prospects")
        .select("id, status")
        .in("message_id", refs)
        .limit(1)
        .maybeSingle();
      prospect = data;
    }
    if (!prospect) {
      const { data } = await sb
        .from("prospects")
        .select("id, status")
        .eq("email", from)
        .maybeSingle();
      prospect = data;
    }
    if (!prospect && from !== FROM_EMAIL)
      prospect = await prospectFromContent(sb, mail, from);
    const excerpt = ownText(mail.text);
    if (!prospect || prospect.status === "new") {
      if (from === FROM_EMAIL) continue;
      await sb.from("prospect_replies").insert({
        message_id: messageId,
        received_at,
        from_email: from,
        subject: mail.subject,
        excerpt,
      });
      added++;
      continue;
    }

    const isStop = STOP_RE.test(excerpt) || STOP_RE.test(mail.subject ?? "");
    await sb.from("prospect_replies").insert({
      prospect_id: prospect.id,
      message_id: messageId,
      received_at,
      from_email: from,
      subject: mail.subject,
      excerpt,
      ...(isStop ? { category: "stop", handled: true } : {}),
    });
    await sb
      .from("prospects")
      .update({
        replied_at: received_at,
        ...(isStop
          ? { status: "unsubscribed" }
          : ["interested", "unsubscribed"].includes(prospect.status)
            ? {}
            : { status: "replied" }),
      })
      .eq("id", prospect.id);
    added++;
  }
} finally {
  lock.release();
  await box.logout();
}

const { count: pending } = await sb
  .from("prospect_replies")
  .select("*", { count: "exact", head: true })
  .is("category", null);
// Journaux GitHub Actions publics : des compteurs, jamais d'adresse ni de contenu
console.log(
  `${added} nouveau(x) message(s) enregistré(s), ${pending} à trier.`,
);
