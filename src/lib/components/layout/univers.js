// Univers d'une page, déduit du chemin : « / » aiguille, la vitrine soirée, ses
// pages d'offre et la création forment ZIK Soirée, tout le reste est le jeu en ligne
export function universOf(path) {
  if (path === "/" || path === "") return "aiguillage";
  if (/^\/(soiree|pro|salon)(\/|$)|^\/vs\//.test(path)) return "soiree";
  return "jeu";
}
