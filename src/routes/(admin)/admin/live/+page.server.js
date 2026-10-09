import { getAdminClient } from "$lib/server/config.js";

export async function load() {
  const { data } = await getAdminClient()
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
