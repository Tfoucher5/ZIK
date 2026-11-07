// Faux Supabase d'une partie de room : à passer à vi.mock("../../../config.js")
const LIGNES = [
  "Papillonnage",
  "Hippopotamus",
  "Kaleidoscope",
  "Xylophonie",
].map((title, i) => ({
  id: `ligne${i}`,
  position: i,
  tracks: {
    id: `titre${i}`,
    artist: `Zorglub${i}`,
    title,
    external_id: `10${i}`,
  },
}));

export function fauxConfig(db) {
  const donnees = {
    rooms: () => db.room,
    room_playlists: () => [{ playlist_id: "p", position: 0 }],
    custom_playlist_tracks: () => LIGNES,
    games: () => ({ id: "partie" }),
  };
  const query = (table) => {
    const chain = new Proxy(
      {},
      {
        get(_, name) {
          if (name === "then")
            return (resolve) =>
              resolve({ data: donnees[table]?.() ?? null, error: null });
          if (name === "insert")
            return (rows) => {
              (db.inserts[table] ??= []).push(rows);
              return chain;
            };
          return () => chain;
        },
      },
    );
    return chain;
  };
  const client = {
    from: query,
    rpc: async (fn, args) => {
      db.rpc.push({ fn, args });
      return { data: null, error: null };
    },
  };
  return { supabase: client, getAdminClient: () => client };
}
