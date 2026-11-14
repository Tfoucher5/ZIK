// Univers d'une page, déduit du chemin : « / » aiguille, la vitrine soirée et ses
// pages d'offre forment ZIK Soirée, tout le reste est le jeu en ligne
export function universOf(path) {
  if (path === "/" || path === "") return "aiguillage";
  if (/^\/(soiree|pro)(\/|$)|^\/vs\//.test(path)) return "soiree";
  return "jeu";
}
