import { adminLoad } from "$lib/server/middleware/adminActions.js";
import { getAdminClient } from "$lib/server/config.js";

async function chargerPage() {
  const { data } = await getAdminClient()
    .schema("play")
    .from("rooms")
    .select("code, name, emoji, is_official")
    .limit(5000);
  return {
    names: Object.fromEntries(
      (data ?? []).map((r) => [
        r.code,
        { name: r.name, emoji: r.emoji, official: r.is_official },
      ]),
    ),
  };
}

export const load = adminLoad(chargerPage);
