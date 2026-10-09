import { error } from "@sveltejs/kit";
import { getCardByNumber } from "$lib/server/services/cardPage.js";
import { buildMusicCardSvg } from "$lib/server/og/musicCard.js";
import { svgToPng } from "$lib/server/og/render.js";

// Image de partage d'une carte. La rareté est figée et les données bougent peu :
// une journée de cache suffit.
const MEMO_LIMIT = 200;
const memo = new Map();

export async function GET({ params, fetch, setHeaders }) {
  setHeaders({
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=86400",
  });
  const cached = memo.get(params.number);
  if (cached) return new Response(cached);

  const result = await getCardByNumber(params.number);
  if (!result) error(404, "Carte introuvable");

  const res = await fetch(result.card.coverXl).catch(() => null);
  const cover = res?.ok
    ? `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`
    : null;
  const png = svgToPng(
    buildMusicCardSvg(
      { ...result.card, rarityLabel: result.rarityLabel },
      cover,
    ),
  );

  if (memo.size >= MEMO_LIMIT) memo.delete(memo.keys().next().value);
  memo.set(params.number, png);
  return new Response(png);
}
