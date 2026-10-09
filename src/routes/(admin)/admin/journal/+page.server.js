import { getJournal } from "$lib/server/services/adminBoard.js";

export async function load({ url }) {
  const days = url.searchParams.get("j") === "30" ? 30 : 7;
  return { days, events: await getJournal(days, 300) };
}
