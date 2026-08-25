export async function load({ fetch }) {
  const [roomsRes, statsRes, eloRes, challengeRes] = await Promise.all([
    fetch("/api/rooms/official"),
    fetch("/api/stats/global"),
    fetch("/api/leaderboard/elo"),
    fetch("/api/challenge/weekly"),
  ]);

  const [roomsData, statsData, eloData, challengeData] = await Promise.all([
    roomsRes.json().catch(() => ({ rooms: [], totalOnline: 0 })),
    statsRes.json().catch(() => ({
      users: 0,
      publicRooms: 0,
      publicPlaylists: 0,
      gamesMonth: 0,
    })),
    eloRes.json().catch(() => []),
    challengeRes.json().catch(() => ({ active: false })),
  ]);

  return {
    rooms: roomsData.rooms ?? [],
    totalOnline: roomsData.totalOnline ?? 0,
    globalStats: {
      users: statsData.users ?? 0,
      publicRooms: statsData.publicRooms ?? 0,
      publicPlaylists: statsData.publicPlaylists ?? 0,
      gamesMonth: statsData.gamesMonth ?? 0,
    },
    eloLb: Array.isArray(eloData) ? eloData : [],
    weeklyChallenge: challengeData,
  };
}
