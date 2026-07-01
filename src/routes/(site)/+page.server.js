export async function load({ fetch }) {
  const [roomsRes, statsRes, eloRes] = await Promise.all([
    fetch("/api/rooms/official"),
    fetch("/api/stats/global"),
    fetch("/api/leaderboard/elo"),
  ]);

  const [roomsData, statsData, eloData] = await Promise.all([
    roomsRes.json().catch(() => ({ rooms: [], totalOnline: 0 })),
    statsRes.json().catch(() => ({ publicPlaylists: 0, gamesMonth: 0 })),
    eloRes.json().catch(() => []),
  ]);

  return {
    rooms: roomsData.rooms ?? [],
    totalOnline: roomsData.totalOnline ?? 0,
    globalStats: {
      publicPlaylists: statsData.publicPlaylists ?? 0,
      gamesMonth: statsData.gamesMonth ?? 0,
    },
    eloLb: Array.isArray(eloData) ? eloData : [],
  };
}
