import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import {
  sanitizeReportTracks,
  sanitizeReportContext,
  asUuidOrNull,
  MIN_REPORT_MESSAGE,
} from "$lib/reports/bug-report.js";
import { reportTrackIssue } from "$lib/server/services/trackIssues.js";
import { roomGames } from "$lib/server/state.js";
import { salonLiveState } from "$lib/server/socket/salon.js";
import { NEWS } from "$lib/news.js";
import { alertAdminsSafe } from "$lib/server/services/adminAlerts.js";

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

// Ce que le serveur sait de la room au moment du signalement
function roomSnapshot(code) {
  const room = code && roomGames[code];
  if (room) {
    const g = room.game;
    return {
      kind: "room",
      active: g.isActive,
      round: `${g.currentRound}/${g.maxRounds}`,
      mode: room.game_mode,
      players: Object.keys(room.players).length,
      track: g.currentTrack
        ? `${g.currentTrack.artist} · ${g.currentTrack.title}`
        : null,
      trackId: g.currentTrack?.id ?? null,
    };
  }
  const salon = salonLiveState(code);
  if (salon) {
    return {
      kind: "salon",
      phase: salon.phase,
      paused: salon.paused,
      round: `${salon.round}/${salon.maxRounds}`,
      players: salon.players,
      pro: salon.pro,
      proGift: salon.proGift,
      hostId: salon.hostId,
      hostConnected: salon.hostConnected,
      screens: salon.screens,
      controls: salon.controls,
      playlistIds: salon.playlistIds,
      trackCount: salon.trackCount,
      settings: salon.settings,
      roster: salon.roster.slice(0, 40),
      track: salon.track
        ? `${salon.track.artist} · ${salon.track.title}`
        : null,
      trackId: salon.track?.id ?? null,
    };
  }
  return null;
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
  const cardNumber =
    type === "bug" && subject === "card" && Number.isInteger(metadata?.card)
      ? metadata.card
      : null;
  const safeMetadata = {
    ...(safeTracks && { tracks: safeTracks }),
    ...(cardNumber != null && { card: cardNumber }),
    context: {
      ...sanitizeReportContext(metadata?.context),
      version: NEWS[0]?.version ?? null,
      userAgent:
        metadata?.context?.userAgent ?? request.headers.get("user-agent"),
      server: roomSnapshot(room_id),
    },
  };

  if (
    typeof message !== "string" ||
    message.trim().length < MIN_REPORT_MESSAGE
  ) {
    return json(
      { error: "Explique le problème en quelques mots." },
      { status: 400 },
    );
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

  const fromSalon = type === "bug" && subject === "salon";
  const pro = fromSalon && safeMetadata.context.server?.pro;
  alertAdminsSafe(fromSalon ? "admin_salons" : "admin_reports", {
    title: fromSalon
      ? `${pro ? "Salon Pro" : "Salon"} ${room_id ?? ""} : besoin d'aide`
      : `${{ bug: "Bug", user: "Joueur signalé", contact: "Message" }[type]} de ${reporter_name?.trim() || "un invité"}`,
    body: message.trim().slice(0, 140),
    url:
      fromSalon && room_id ? `/admin/salons?code=${room_id}` : "/admin/reports",
  });

  // Un titre désigné part aussi dans la file « Réparer » de l'admin
  if (type === "bug" && safeTracks) {
    const kind = subject === "mauvaise-reponse" ? "answer" : "audio";
    for (const t of safeTracks)
      reportTrackIssue(
        asUuidOrNull(t.trackId),
        kind,
        "player",
        message?.trim() || null,
        {
          room: room_id || null,
          videoId: t.videoId,
        },
      );
  }

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
