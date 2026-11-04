import { json } from "@sveltejs/kit";
import { publicLevel } from "$lib/server/services/health/status.js";

// Lu par la pastille du pied de page : hors du rendu, car plusieurs pages sont
// servies depuis un cache public et l'état y resterait figé
export function GET() {
  return json(
    { level: publicLevel() },
    { headers: { "cache-control": "no-store" } },
  );
}
