import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";
import { svgToPng } from "$lib/server/og/render.js";
import { buildMusicCardSvg } from "$lib/server/og/musicCard.js";
import { RARITIES } from "$lib/components/card/rarity.js";
import { demoCards } from "../../demo.js";

// Image de partage d'une carte du prototype : visible en local uniquement.
export async function GET({ params, fetch }) {
  if (!dev) error(404, "Page introuvable");
  const card = demoCards.find((c) => c.id === params.id);
  if (!card) error(404, "Carte introuvable");

  const res = await fetch(card.coverXl);
  const cover = res.ok
    ? `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`
    : null;

  const png = svgToPng(
    buildMusicCardSvg(
      { ...card, rarityLabel: RARITIES[card.rarity].label },
      cover,
    ),
  );
  return new Response(png, { headers: { "Content-Type": "image/png" } });
}
