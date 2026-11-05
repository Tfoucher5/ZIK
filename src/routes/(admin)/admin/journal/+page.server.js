import { adminLoad } from "$lib/server/middleware/adminActions.js";
import { getJournal } from "$lib/server/services/admin/board.js";

async function chargerPage({ url }) {
  const days = url.searchParams.get("j") === "30" ? 30 : 7;
  return { days, events: await getJournal(days, 300) };
}

export const load = adminLoad(chargerPage);
