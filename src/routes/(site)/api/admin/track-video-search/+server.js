import { json } from "@sveltejs/kit";
import { YouTube } from "$lib/server/youtube.js";
import { requireAdminToken } from "$lib/server/middleware/auth.js";

// Vidéos YouTube candidates pour un titre, avec de quoi les regarder dans
// l'admin. N'écrit rien : l'épinglage reste un geste explicite.
export async function POST({ url, request }) {
  await requireAdminToken(url.searchParams.get("token"));
  const { query } = await request.json();
  const q = (query ?? "").trim();
  if (!q) return json({ error: "Recherche vide" }, { status: 400 });

  try {
    const results = await YouTube.search(q, { type: "video", limit: 8 });
    return json({
      videos: results.map((v) => ({
        id: v.id,
        title: v.title ?? "",
        channel: v.channel?.name ?? "",
        duration: Math.round((v.duration || 0) / 1000),
        thumbnail:
          v.thumbnail?.url ?? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
        topic: Boolean(v.channel?.name?.endsWith("- Topic")),
      })),
    });
  } catch (e) {
    return json({ error: `YouTube : ${e.message}` }, { status: 502 });
  }
}
