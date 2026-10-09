import { fail } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";

const STATUSES = ["pending", "resolved", "dismissed"];

async function sendReplyMail(report, reply) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/send-reply`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reporter_email: report.reporter_email,
        reporter_name: report.reporter_name,
        admin_reply: reply,
        report_type: report.type,
        report_subject: report.subject,
      }),
    },
  ).catch((err) => {
    console.error("send-reply failed:", err);
    return null;
  });
  return res?.ok ?? false;
}

export async function load() {
  const sb = getAdminClient();
  const [pendingRes, doneRes] = await Promise.all([
    sb
      .from("reports")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(500),
    sb
      .from("reports")
      .select("*")
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const rows = [...(pendingRes.data ?? []), ...(doneRes.data ?? [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  const uniq = (xs) => [...new Set(xs.filter(Boolean))];
  const userIds = uniq(
    rows.flatMap((r) => [r.reporter_id, r.reported_user_id]),
  );
  const roomCodes = uniq(rows.map((r) => r.room_id));
  const trackIds = uniq(
    rows.flatMap((r) => (r.metadata?.tracks ?? []).map((t) => t.trackId)),
  );

  const [profilesRes, roomsRes, tracksRes, issuesRes] = await Promise.all([
    userIds.length
      ? sb.from("profiles").select("id, username, avatar_url").in("id", userIds)
      : { data: [] },
    roomCodes.length
      ? sb.from("rooms").select("code, name, emoji").in("code", roomCodes)
      : { data: [] },
    trackIds.length
      ? sb
          .from("tracks")
          .select("id, artist, title, cover_url")
          .in("id", trackIds)
      : { data: [] },
    trackIds.length
      ? sb
          .from("track_issues")
          .select("track_id")
          .eq("status", "open")
          .in("track_id", trackIds)
      : { data: [] },
  ]);

  const byId = (list, key = "id") =>
    Object.fromEntries((list ?? []).map((x) => [x[key], x]));
  const profiles = byId(profilesRes.data);
  const rooms = byId(roomsRes.data, "code");
  const tracks = byId(tracksRes.data);
  const openIssues = new Set((issuesRes.data ?? []).map((i) => i.track_id));

  return {
    reports: rows.map((r) => {
      const { tracks: reported, ...extra } = r.metadata ?? {};
      return {
        ...r,
        reporter: profiles[r.reporter_id] ?? null,
        reported: profiles[r.reported_user_id] ?? null,
        room: rooms[r.room_id] ?? null,
        extra,
        tracks: (reported ?? []).map((t) => ({
          round: t.round,
          answer: t.answer,
          track: tracks[t.trackId] ?? null,
          toFix: openIssues.has(t.trackId),
        })),
      };
    }),
    error: pendingRes.error?.message ?? doneRes.error?.message ?? null,
  };
}

export const actions = {
  updateStatus: async ({ request, locals }) => {
    const fd = await request.formData();
    const id = fd.get("id");
    const status = fd.get("status");
    if (!id || !STATUSES.includes(status))
      return fail(400, { error: "Action invalide" });
    const note = fd.get("admin_note")?.trim() || null;
    const reply = fd.get("admin_reply")?.trim() || null;

    const sb = getAdminClient();
    const { data: report } = await sb
      .from("reports")
      .select("reporter_email, reporter_name, type, subject, admin_reply")
      .eq("id", id)
      .single();
    if (!report) return fail(404, { error: "Message introuvable" });

    const { error: err } = await sb
      .from("reports")
      .update({
        status,
        admin_note: note,
        admin_reply: reply,
        resolved_at: status !== "pending" ? new Date().toISOString() : null,
        resolved_by: status !== "pending" ? locals.adminId : null,
      })
      .eq("id", id);
    if (err) return fail(500, { error: err.message });

    let sent = false;
    if (reply && reply !== report.admin_reply?.trim() && report.reporter_email)
      sent = await sendReplyMail(report, reply);

    const label = {
      pending: "Remis à traiter",
      resolved: "Marqué comme traité",
      dismissed: "Classé sans suite",
    }[status];
    return {
      message: sent ? `${label}, réponse envoyée par email.` : `${label}.`,
    };
  },

  sendReply: async ({ request }) => {
    const fd = await request.formData();
    const id = fd.get("id");
    const reply = fd.get("admin_reply")?.trim();
    if (!id || !reply) return fail(400, { error: "La réponse est vide." });

    const sb = getAdminClient();
    const { data: report } = await sb
      .from("reports")
      .select("reporter_email, reporter_name, type, subject")
      .eq("id", id)
      .single();
    if (!report?.reporter_email)
      return fail(400, { error: "Pas d'email pour répondre." });

    await sb.from("reports").update({ admin_reply: reply }).eq("id", id);
    if (!(await sendReplyMail(report, reply)))
      return fail(502, {
        error: "Réponse enregistrée, mais l'email n'est pas parti.",
      });
    return { message: `Réponse envoyée à ${report.reporter_email}.` };
  },

  deleteReport: async ({ request, locals }) => {
    const fd = await request.formData();
    const id = fd.get("id");
    if (!id) return fail(400, { error: "id requis" });
    const { error: err } = await getAdminClient()
      .from("reports")
      .delete()
      .eq("id", id);
    if (err) return fail(500, { error: err.message });
    await logAdminAction(locals.adminId, "delete_report", id, "report");
    return { message: "Message supprimé.", deleted: id };
  },
};
