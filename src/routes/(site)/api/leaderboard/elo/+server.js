import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";

function makeCache(ttlMs) {
  let _data = null,
    _exp = 0;
  return {
    get() {
      return _exp > Date.now() ? _data : null;
    },
    set(v) {
      _data = v;
      _exp = Date.now() + ttlMs;
    },
  };
}
const _cache = makeCache(60_000);

export async function GET({ url }) {
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));
  if (offset === 0) {
    const cached = _cache.get();
    if (cached) return json(cached);
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("username, avatar_url, elo, level, games_played")
    .order("elo", { ascending: false })
    .range(offset, offset + 19);
  if (error) return json({ error: error.message }, { status: 500 });
  if (offset === 0) _cache.set(data);
  const cc =
    offset === 0
      ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" }
      : {};
  return json(data, { headers: cc });
}
