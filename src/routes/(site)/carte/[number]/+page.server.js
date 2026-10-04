import { error } from "@sveltejs/kit";
import { getCardByNumber } from "$lib/server/services/cardPage.js";

export async function load({ params, setHeaders }) {
  const result = await getCardByNumber(params.number);
  if (!result) error(404, "Carte introuvable");
  setHeaders({ "Cache-Control": "public, max-age=300" });
  return result;
}
