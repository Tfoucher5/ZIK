// Les trois étages de la tour, sans dépendance à three.js. Le Plateau suit la disposition des pôles.
export const ETAGES = [
  { id: "plateau", nom: "Plateau", y: 0 },
  { id: "direction", nom: "Direction", y: 4.2, bornes: [-13, 22, -11, 7] },
  { id: "penthouse", nom: "Penthouse", y: 8.4, bornes: [0, 22, -11, 5] },
];

export const VILLE = "ville";

// Coupe de la tour : l'étage choisi et ceux du dessous restent visibles ; la ville montre tout.
export const visibles = (choix) =>
  ETAGES.map((_, i) => choix === VILLE || i <= choix);

// Où la caméra se pose pour un choix : hauteur du sol, bornes [xmin, xmax, zmin, zmax], recul.
export function cadrage(choix, plateau) {
  if (choix === VILLE) return { y: ETAGES[1].y, bornes: plateau, recul: 1.5 };
  const e = ETAGES[choix];
  return { y: e.y, bornes: e.bornes ?? plateau, recul: 1 };
}
