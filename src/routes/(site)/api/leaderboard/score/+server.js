import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";

const VALID_MODES = ["classique", "qcm"];
const VALID_ROOMS = ["officielles", "toutes"];
const VALID_PERIODS = ["semaine", "mois", "alltime"];

const _caches = {};
function getCache(key) {
  if (!_caches[key]) {
    let _data = null,
      _exp = 0;
    _caches[key] = {
      get() {
        return _exp > Date.now() ? _data : null;
      },
      set(v) {
        _data = v;
        _exp = Date.now() + 60_000;
      },
    };
  }
  return _caches[key];
}

export async function GET({ url }) {
  const mode = VALID_MODES.includes(url.searchParams.get("mode"))
    ? url.searchParams.get("mode")
    : "classique";
  const rooms = VALID_ROOMS.includes(url.searchParams.get("rooms"))
    ? url.searchParams.get("rooms")
    : "officielles";
  const periode = VALID_PERIODS.includes(url.searchParams.get("periode"))
    ? url.searchParams.get("periode")
    : "semaine";
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));
  const limit = 20;

  const cacheKey = `${mode}:${rooms}:${periode}:${offset}`;
  const cache = getCache(cacheKey);
  const cached = cache.get();
  if (cached) return json(cached);

  const { data, error } = await supabase.rpc("leaderboard_score", {
    p_mode: mode,
    p_rooms: rooms,
    p_period: periode,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) return json({ error: error.message }, { status: 500 });
  cache.set(data);
  return json(data ?? []);
}
