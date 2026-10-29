import { json } from "@sveltejs/kit";
import { checkRateLimit } from "$lib/server/middleware/auth.js";

// Lien court link.deezer.com/s/<id> -> lien deezer.com qu'il redirige
export async function GET({ request, params }) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  checkRateLimit(`dz-link:${ip}`, 30, 60_000);
  if (!/^\w+$/.test(params.id))
    return json({ error: "Lien invalide" }, { status: 400 });

  try {
    const r = await fetch(`https://link.deezer.com/s/${params.id}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    // Réponse : link.deezer.com/?dest=<lien deezer.com>
    const location = new URL(r.headers.get("location") ?? "", r.url);
    const url = location.searchParams.get("dest") ?? "";
    if (!/^https:\/\/www\.deezer\.com\//.test(url))
      throw new Error("Lien Deezer introuvable");
    return json({ url });
  } catch (e) {
    return json({ error: e.message }, { status: 502 });
  }
}
