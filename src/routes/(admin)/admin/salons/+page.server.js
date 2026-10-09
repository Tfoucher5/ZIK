import { getAdminClient } from "$lib/server/config.js";

const DAY = 24 * 3600_000;

export async function load() {
  const sb = getAdminClient();
  const live = Object.values(globalThis.__zik_salonRooms ?? {}).map((s) => {
    const playing = s.game.phase === "round" || s.game.phase === "summary";
    const t = s.game.currentTrack;
    return {
      code: s.code,
      pro: s.pro,
      hostId: s.hostUserId,
      players: Object.keys(s.players ?? {}).length,
      phase: s.game.phase,
      round: s.game.currentRound,
      maxRounds: s.settings.maxRounds,
      limitHits: s.limitHits ?? 0,
      track:
        playing && t
          ? {
              id: t.id,
              artist: t.artist,
              title: t.title,
              youtube_id: t.youtube_id ?? null,
              youtube_start: t.youtube_start ?? null,
            }
          : null,
      video: playing ? (s.game.currentVideo ?? null) : null,
    };
  });

  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [{ data: games }, { count: videoIssues }, { data: pros }] =
    await Promise.all([
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
    ]);

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
    live: live.map((s) => ({ ...s, host: name[s.hostId] ?? null })),
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
