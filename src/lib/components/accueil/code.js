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

export const CODE_AIDE =
  "Le code de 6 caractères affiché sur la TV de la soirée, ou celui qu'on t'a envoyé pour une partie en ligne.";
export const CODE_INCOMPLET =
  "Le code fait 6 caractères. Recopie-le depuis la TV ou le message reçu.";

// Renvoie le message d'erreur à afficher, ou "" une fois parti vers la soirée ou la room
export async function joinCode(code, { joinRoom, goto, fetchFn = fetch }) {
  if (code.length !== 6) return CODE_INCOMPLET;
  if ((await codeTarget(code, fetchFn)) === "room") joinRoom(code);
  else goto(`/salon/play?code=${code}`);
  return "";
}
