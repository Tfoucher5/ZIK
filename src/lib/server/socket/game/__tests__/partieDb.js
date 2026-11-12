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
    games: () => (db.insertGameKo ? null : { id: "partie" }),
    profiles: () => db.profil ?? null,
  };
  const query = (table, anon) => {
    const chain = new Proxy(
      {},
      {
        get(_, name) {
          if (anon && (name === "insert" || name === "update"))
            (db.ecrituresAnon ??= []).push(table);
          if (name === "then")
            return (resolve) =>
              resolve({
                data: donnees[table]?.() ?? null,
                error: table === "rooms" ? (db.erreurRoom ?? null) : null,
              });
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
    // Jeton de test : « jeton:<id du compte> »
    auth: {
      getUser: async (token) => {
        await db.attenteAuth?.();
        return {
          data: {
            user: token.startsWith("jeton:") ? { id: token.slice(6) } : null,
          },
          error: null,
        };
      },
    },
    from: (table) => query(table, false),
    schema() {
      return this;
    },
    rpc: async (fn, args) => {
      db.rpc.push({ fn, args });
      return { data: null, error: null };
    },
  };
  return {
    // Client distinct : une écriture avec la clé publique se voit dans les tests
    supabase: { ...client, from: (table) => query(table, true) },
    getAdminClient: () => client,
  };
}
