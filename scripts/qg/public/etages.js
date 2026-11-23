// Où la caméra se pose pour un niveau de la tour ou pour la ville, sans dépendance à three.js.
import { TRAME, niveau } from "./tour/plan.js";

export const VILLE = "ville";

// Hauteur du sol regardé, bornes [xmin, xmax, zmin, zmax] autour de la tour, recul.
export function cadrage(choix) {
  const [l, p] = [TRAME.largeur / 2 + 2, TRAME.profondeur / 2 + 2];
  const bornes = [-l, l, -p, p];
  if (choix === VILLE) return { y: 16, bornes, recul: 2.6 };
  return { y: niveau(choix).z, bornes, recul: 1 };
}
