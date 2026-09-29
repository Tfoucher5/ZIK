import { error } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { findTheme, BLIND_TEST_THEMES } from "$lib/blindTestThemes.js";

const ARTIST_SAMPLE = 12;

// Artistes les plus présents dans la playlist : du contenu propre à la page,
// et un aperçu concret de ce qu'on va entendre.
async function topArtists(playlistId) {
  const { data } = await supabase
    .from("custom_playlist_tracks")
    .select("tracks(artist)")
    .eq("playlist_id", playlistId)
    .limit(1000);
  const counts = new Map();
  for (const row of data ?? []) {
    const artist = row.tracks?.artist?.trim();
    if (artist) counts.set(artist, (counts.get(artist) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, ARTIST_SAMPLE)
    .map(([artist]) => artist);
}

export async function load({ params, setHeaders }) {
  const theme = findTheme(params.theme);
  if (!theme) error(404, "Thème introuvable");

  setHeaders({ "cache-control": "public, max-age=3600" });

  return {
    theme,
    artists: await topArtists(theme.playlists[0]).catch(() => []),
    others: BLIND_TEST_THEMES.filter((t) => t.slug !== theme.slug).map(
      ({ slug, name, emoji }) => ({ slug, name, emoji }),
    ),
  };
}
