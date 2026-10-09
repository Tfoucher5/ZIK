import { fail } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { salonRooms } from "$lib/server/state.js";
import {
  salonLiveState,
  supportPause,
  supportResume,
  supportSkip,
  supportKick,
  supportGiftPro,
  supportMessage,
} from "$lib/server/socket/salon.js";

const DAY = 24 * 3600_000;

export async function load() {
  const sb = getAdminClient();
  const live = Object.keys(salonRooms).map(salonLiveState).filter(Boolean);
  const playlistIds = [...new Set(live.flatMap((s) => s.playlistIds))];

  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [
    { data: games },
    { count: videoIssues },
    { data: pros },
    { data: playlists },
  ] = await Promise.all([
    sb
      .from("games")
      .select("host_id, player_count, limit_hits, started_at")
      .eq("source", "salon")
      .gte("started_at", since)
      .not("ended_at", "is", null),
    sb
      .from("track_issues")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")
      .eq("kind", "video"),
    sb
      .from("pro_subscriptions")
      .select("user_id")
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString()),
    playlistIds.length
      ? sb.from("custom_playlists").select("id, name").in("id", playlistIds)
      : { data: [] },
  ]);
  const playlistName = Object.fromEntries(
    (playlists ?? []).map((p) => [p.id, p.name]),
  );

  const proSet = new Set((pros ?? []).map((p) => p.user_id));
  const hosts = {};
  for (const g of games ?? []) {
    if (!g.host_id) continue;
    const h = (hosts[g.host_id] ??= {
      id: g.host_id,
      games: 0,
      max: 0,
      limitHits: 0,
      last: g.started_at,
    });
    h.games++;
    h.max = Math.max(h.max, g.player_count ?? 0);
    h.limitHits += g.limit_hits ?? 0;
    if (g.started_at > h.last) h.last = g.started_at;
  }

  const ids = [
    ...new Set([
      ...Object.keys(hosts),
      ...live.map((s) => s.hostId).filter(Boolean),
    ]),
  ];
  const { data: profs } = ids.length
    ? await sb.from("profiles").select("id, username").in("id", ids)
    : { data: [] };
  const name = Object.fromEntries((profs ?? []).map((p) => [p.id, p.username]));

  const list = games ?? [];
  return {
    live: live.map((s) => ({
      ...s,
      host: name[s.hostId] ?? null,
      playlists: s.playlistIds.map((id) => playlistName[id] ?? "Playlist"),
    })),
    month: {
      games: list.length,
      avgPlayers: list.length
        ? Math.round(
            (list.reduce((n, g) => n + (g.player_count ?? 0), 0) /
              list.length) *
              10,
          ) / 10
        : 0,
      limitHits: list.reduce((n, g) => n + (g.limit_hits ?? 0), 0),
      guests: list.filter((g) => !g.host_id).length,
    },
    hosts: Object.values(hosts)
      .map((h) => ({
        ...h,
        username: name[h.id] ?? "?",
        pro: proSet.has(h.id),
      }))
      .sort((a, b) => b.limitHits - a.limitHits || b.games - a.games),
    videoIssues: videoIssues ?? 0,
  };
}

// Dépannage d'un salon en cours : mêmes fonctions que la régie
function supportAction(action, run, done) {
  return async ({ request, locals }) => {
    const fd = await request.formData();
    const code = String(fd.get("code") ?? "").toUpperCase();
    try {
      const result = run(code, fd);
      await logAdminAction(locals.adminId, action, code, "salon", {
        ...(fd.get("username") && { username: fd.get("username") }),
        ...(fd.get("message") && { message: fd.get("message") }),
      });
      return { code, message: done(result, fd) };
    } catch (e) {
      return fail(400, { code, error: e.message });
    }
  };
}

export const actions = {
  pause: supportAction(
    "salon_pause",
    (code) => supportPause(code),
    () => "Salon mis en pause.",
  ),
  resume: supportAction(
    "salon_resume",
    (code) => supportResume(code),
    () => "La partie reprend.",
  ),
  skip: supportAction(
    "salon_skip",
    (code) => supportSkip(code),
    (r) =>
      r === "revealed"
        ? "Réponse révélée, la partie continue."
        : "Manche suivante lancée.",
  ),
  kick: supportAction(
    "salon_kick",
    (code, fd) => supportKick(code, String(fd.get("username") ?? "")),
    (_, fd) => `${fd.get("username")} a été retiré du salon.`,
  ),
  giftPro: supportAction(
    "salon_gift_pro",
    (code) => supportGiftPro(code),
    () => "ZIK Pro offert à ce salon pour la soirée.",
  ),
  message: supportAction(
    "salon_support_message",
    (code, fd) =>
      supportMessage(code, fd.get("message"), String(fd.get("target") ?? "")),
    () => "Message affiché.",
  ),
};
