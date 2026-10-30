import { json } from "@sveltejs/kit";
import { ytsQuery } from "$lib/server/socket/game/audio.js";
import { requireAdminToken } from "$lib/server/middleware/auth.js";

// Vidéos YouTube candidates pour un titre, avec de quoi les regarder dans
// l'admin. N'écrit rien : l'épinglage reste un geste explicite.
export async function POST({ url, request }) {
  await requireAdminToken(url.searchParams.get("token"));
  const { query } = await request.json();
  const q = (query ?? "").trim();
  if (!q) return json({ error: "Recherche vide" }, { status: 400 });

  const { results, autoIndex } = await ytsQuery(q, 8);
  return json({
    videos: results.map((v, i) => ({
      id: v.id,
      title: v.title,
      channel: v.channel.name,
      duration: Math.round(v.duration / 1000),
      thumbnail: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
      topic: v.channel.name.endsWith("- Topic"),
      auto: i === autoIndex,
    })),
  });
}
