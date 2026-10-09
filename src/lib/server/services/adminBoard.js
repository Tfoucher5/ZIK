import { getAdminClient } from "../config.js";
import { getMaintenance } from "../maintenance.js";
import { openSupportCount } from "../socket/salonSupport.js";

const DAY = 24 * 3600_000;

export function liveCounts() {
  const rooms = Object.values(globalThis.__zik_roomGames ?? {});
  const salons = Object.values(globalThis.__zik_salonRooms ?? {});
  const roomPlayers = rooms.reduce(
    (n, g) => n + Object.keys(g.socketToName ?? {}).length,
    0,
  );
  const salonPlayers = salons.reduce(
    (n, s) => n + Object.keys(s.players ?? {}).length,
    0,
  );
  return {
    rooms: rooms.filter((g) => Object.keys(g.socketToName ?? {}).length).length,
    salons: salons.length,
    calls: openSupportCount(),
    players: roomPlayers + salonPlayers,
  };
}

const count = (q) => q.then(({ count }) => count ?? 0);

// Ce qui demande une action de l'admin, par ordre d'urgence
export async function getTodo() {
  const sb = getAdminClient();
  const head = { count: "exact", head: true };
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();

  const [pastDue, issues, reports, replies, limit, maintenance] =
    await Promise.all([
      count(
        sb.from("pro_subscriptions").select("*", head).eq("status", "past_due"),
      ),
      count(sb.from("track_issues").select("*", head).eq("status", "open")),
      count(sb.from("reports").select("*", head).eq("status", "pending")),
      count(
        sb
          .from("prospect_replies")
          .select("*", head)
          .eq("handled", false)
          .in("category", ["interested", "question"]),
      ),
      sb
        .from("games")
        .select("limit_hits")
        .eq("source", "salon")
        .gt("limit_hits", 0)
        .gte("started_at", weekAgo)
        .then(({ data }) => (data ?? []).reduce((n, g) => n + g.limit_hits, 0)),
      getMaintenance(),
    ]);

  const errors = (globalThis.__zik_errorLog ?? []).filter(
    (e) => e.ts >= Date.now() - DAY && e.level === "error",
  ).length;

  const calls = openSupportCount();

  const items = [
    calls && {
      key: "calls",
      tone: "bad",
      n: calls,
      label: `${calls} salon${calls > 1 ? "s appellent" : " appelle"} un admin`,
      action: "Répondre",
      href: "/admin/salons",
    },
    maintenance?.enabled && {
      key: "maintenance",
      tone: "bad",
      n: 1,
      label: "Le site est en maintenance",
      action: "Rouvrir",
      href: "/admin/reglages",
    },
    pastDue && {
      key: "past_due",
      tone: "bad",
      n: pastDue,
      label: `${pastDue} abonné${pastDue > 1 ? "s" : ""} Pro en échec de paiement`,
      action: "Voir",
      href: "/admin/argent",
    },
    replies && {
      key: "replies",
      tone: "warn",
      n: replies,
      label: `${replies} prospect${replies > 1 ? "s" : ""} intéressé${replies > 1 ? "s" : ""} attend${replies > 1 ? "ent" : ""} ta réponse`,
      action: "Répondre",
      href: "/admin/prospection",
    },
    issues && {
      key: "issues",
      tone: "warn",
      n: issues,
      label: `${issues} titre${issues > 1 ? "s" : ""} à réparer`,
      action: "Réparer",
      href: "/admin/reparer",
    },
    reports && {
      key: "reports",
      tone: "warn",
      n: reports,
      label: `${reports} signalement${reports > 1 ? "s" : ""} de joueurs à lire`,
      action: "Lire",
      href: "/admin/reports",
    },
    errors && {
      key: "errors",
      tone: "warn",
      n: errors,
      label: `${errors} erreur${errors > 1 ? "s" : ""} serveur depuis 24 h`,
      action: "Voir",
      href: "/admin/errors",
    },
    limit && {
      key: "limit",
      tone: "info",
      n: limit,
      label: `${limit} joueur${limit > 1 ? "s" : ""} refusé${limit > 1 ? "s" : ""} par la limite gratuite des salons cette semaine`,
      action: "Hôtes",
      href: "/admin/salons",
    },
  ].filter(Boolean);

  return { items, issues };
}

const PLAN = {
  night: "Soirée",
  monthly: "Mensuel",
  yearly: "Annuel",
  manual: "offert",
};

// Ce qui s'est passé sur le site, du plus récent au plus ancien
export async function getJournal(days = 2, limit = 60) {
  const sb = getAdminClient();
  const since = new Date(Date.now() - days * DAY).toISOString();

  const [signups, pros, salons, reports, issues, replies] = await Promise.all([
    sb
      .from("profiles")
      .select("id, username, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(limit),
    sb
      .from("pro_subscriptions")
      .select("user_id, plan, status, created_at, updated_at")
      .gte("updated_at", since),
    sb
      .from("games")
      .select("id, room_id, host_id, player_count, limit_hits, ended_at")
      .eq("source", "salon")
      .gte("ended_at", since)
      .order("ended_at", { ascending: false })
      .limit(limit),
    sb
      .from("reports")
      .select("id, type, subject, reporter_name, created_at")
      .gte("created_at", since)
      .limit(limit),
    sb
      .from("track_issues")
      .select("id, kind, source, created_at, track:track_id(artist, title)")
      .gte("created_at", since)
      .limit(limit),
    sb
      .from("prospect_replies")
      .select("id, from_email, category, summary, received_at")
      .gte("received_at", since)
      .limit(limit),
  ]);

  const ids = [
    ...(pros.data ?? []).map((p) => p.user_id),
    ...(salons.data ?? []).map((g) => g.host_id).filter(Boolean),
  ];
  const { data: profs } = ids.length
    ? await sb
        .from("profiles")
        .select("id, username")
        .in("id", [...new Set(ids)])
    : { data: [] };
  const name = Object.fromEntries((profs ?? []).map((p) => [p.id, p.username]));

  const ISSUE = {
    video: "vidéo salon",
    audio: "audio room",
    answer: "infos du titre",
  };
  const events = [
    ...(signups.data ?? []).map((p) => ({
      ts: p.created_at,
      kind: "signup",
      text: `${p.username} s'est inscrit`,
      href: `/admin/users/${p.id}`,
    })),
    ...(pros.data ?? []).map((p) => ({
      ts:
        p.status === "active" && p.created_at >= since
          ? p.created_at
          : p.updated_at,
      kind: p.status === "active" ? "pro" : "pro_bad",
      text:
        p.status === "past_due"
          ? `Paiement refusé pour ${name[p.user_id] ?? "un abonné"}`
          : p.status === "canceled"
            ? `${name[p.user_id] ?? "Un abonné"} a résilié son Pro`
            : `${name[p.user_id] ?? "Quelqu'un"} est passé Pro (${PLAN[p.plan]})`,
      href: `/admin/users/${p.user_id}`,
    })),
    ...(salons.data ?? []).map((g) => ({
      ts: g.ended_at,
      kind: "salon",
      text: `Salon de ${name[g.host_id] ?? "un invité"} terminé : ${g.player_count ?? 0} joueur${g.player_count > 1 ? "s" : ""}${g.limit_hits ? `, ${g.limit_hits} refusé${g.limit_hits > 1 ? "s" : ""} par la limite` : ""}`,
      href: g.host_id ? `/admin/users/${g.host_id}` : "/admin/salons",
    })),
    ...(reports.data ?? []).map((r) => ({
      ts: r.created_at,
      kind: "report",
      text: `${r.type === "bug" ? "Bug signalé" : "Message"}${r.subject ? ` (${r.subject})` : ""}${r.reporter_name ? ` par ${r.reporter_name}` : ""}`,
      href: "/admin/reports",
    })),
    ...(issues.data ?? [])
      .filter((i) => i.track)
      .map((i) => ({
        ts: i.created_at,
        kind: "issue",
        text: `Problème ${ISSUE[i.kind]} : ${i.track.artist} · ${i.track.title}`,
        href: "/admin/reparer",
      })),
    ...(replies.data ?? []).map((r) => ({
      ts: r.received_at,
      kind: "prospect",
      text: `Réponse de prospect (${r.from_email})${r.summary ? ` : ${r.summary}` : ""}`,
      href: "/admin/prospection",
    })),
  ];

  return events.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit);
}
