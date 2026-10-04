// Forme d'une carte telle que l'affichent Card, CardDrop et CardTray, à partir
// d'une ligne `cards` jointe à son album et son artiste.
export const CARD_SELECT =
  "id, number, title, artist, artist_id, album_id, year, rarity, deezer_rank, card_albums(title, genre, cover_url, cover_md_url, dominant_color), card_artists(nb_fan)";

export function toCardView(row, successRate = null) {
  if (!row) return null;
  const album = row.card_albums || {};
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    artist: row.artist,
    artistId: row.artist_id,
    albumId: row.album_id,
    album: album.title || "",
    year: row.year,
    genre: album.genre || "",
    rarity: row.rarity,
    rank: row.deezer_rank,
    fans: row.card_artists?.nb_fan ?? 0,
    coverMd: album.cover_md_url || album.cover_url || "",
    coverXl: album.cover_url || album.cover_md_url || "",
    color: album.dominant_color || "#303036",
    successRate,
    shareImage: `/carte/${row.number}/card.png`,
  };
}
