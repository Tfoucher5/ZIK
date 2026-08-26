import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { sanitizeReportTracks, asUuidOrNull } from "$lib/reports/bug-report.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sendReportNotification(report) {
  if (!SUPABASE_URL) return;
  await fetch(`${SUPABASE_URL}/functions/v1/send-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(report),
  });
}

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalide" }, { status: 400 });
  }

  const {
    type,
    message,
    reporter_name,
    reporter_email,
    reporter_id,
    reported_user_id,
    reported_username,
    room_id,
    subject,
    metadata,
  } = body;

  if (!["bug", "user", "contact"].includes(type)) {
    return json({ error: "Type invalide" }, { status: 400 });
  }
  // metadata vient du client : on ne recopie que des champs connus.
  const safeTracks = metadata?.tracks
    ? sanitizeReportTracks(metadata.tracks)
    : null;
  const safeMetadata = safeTracks ? { ...metadata, tracks: safeTracks } : {};

  // Un titre désigné vaut description : le message n'est alors plus exigé.
  const titreDesigne =
    type === "bug" && subject === "audio" && safeTracks?.length > 0;
  if (!message?.trim() && !titreDesigne) {
    return json({ error: "Message requis" }, { status: 400 });
  }
  if (type === "contact" && !reporter_email?.trim()) {
    return json({ error: "Email requis pour un contact" }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Un invité envoie un identifiant local, pas un uuid : le pseudo suffit.
  const reporterUuid = asUuidOrNull(reporter_id);

  let resolvedEmail = reporter_email?.trim() || null;
  if (!resolvedEmail && reporterUuid) {
    const { data: authUser } =
      await supabase.auth.admin.getUserById(reporterUuid);
    resolvedEmail = authUser?.user?.email || null;
  }

  const { error } = await supabase.from("reports").insert({
    type,
    message: message.trim(),
    reporter_id: reporterUuid,
    reporter_name: reporter_name?.trim() || null,
    reporter_email: resolvedEmail,
    reported_user_id: asUuidOrNull(reported_user_id),
    reported_username: reported_username?.trim() || null,
    room_id: room_id || null,
    subject: subject?.trim() || null,
    metadata: safeMetadata,
  });

  if (error) return json({ error: error.message }, { status: 500 });

  // Notif email via Edge Function Supabase (non bloquant)
  sendReportNotification({
    type,
    message,
    reporter_name,
    reporter_email,
    reported_username,
    room_id,
    subject,
    metadata,
  }).catch(() => {});

  return json({ ok: true });
}
