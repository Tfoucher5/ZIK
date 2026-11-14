export const cleanCode = (v) =>
  v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

const ok = (fetchFn, url) =>
  fetchFn(url, { signal: AbortSignal.timeout(5000) })
    .then((r) => r.ok)
    .catch(() => false);

// La soirée passe en premier (produit principal), puis la room en ligne ;
// sinon /salon/play affiche lui-même l'erreur d'un code inconnu
export async function codeTarget(code, fetchFn = fetch) {
  if (await ok(fetchFn, `/api/salon?code=${code}`)) return "salon";
  return (await ok(fetchFn, `/api/rooms/${code}`)) ? "room" : "salon";
}
