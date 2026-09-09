import { error } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { buildResultCardSvg } from "$lib/server/og/resultCard.js";
import { svgToPng } from "$lib/server/og/render.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Un résultat est figé une fois la partie terminée : l'image ne changera
// jamais, on peut donc la garder indéfiniment.
const CACHE_HEADER = "public, max-age=31536000, immutable";
const MEMO_LIMIT = 200;
const memo = new Map();

export async function GET({ params, setHeaders }) {
  if (!UUID_RE.test(params.id)) throw error(404, "Résultat introuvable");

  setHeaders({ "Content-Type": "image/png", "Cache-Control": CACHE_HEADER });

  const cached = memo.get(params.id);
  if (cached) return new Response(cached);

  const { data: result } = await supabase
    .from("game_results")
    .select("username, score, rank, total_players, room_name")
    .eq("id", params.id)
    .single();

  if (!result) throw error(404, "Résultat introuvable");

  const png = svgToPng(
    buildResultCardSvg({
      username: result.username,
      score: result.score,
      rank: result.rank,
      totalPlayers: result.total_players,
      roomName: result.room_name,
    }),
  );

  if (memo.size >= MEMO_LIMIT) memo.delete(memo.keys().next().value);
  memo.set(params.id, png);

  return new Response(png);
}
