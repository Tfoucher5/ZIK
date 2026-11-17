// Passage du plan (mètres, origine nord-ouest, x vers l'est, y vers le sud) au monde 3D (tour centrée, y vers le haut).
export const CENTRE = { x: 21.6, y: 12.6 };

export const versMonde = (x, y, altitude = 0) => ({
  x: x - CENTRE.x,
  y: altitude,
  z: y - CENTRE.y,
});

// Dans le groupe d'un niveau (déjà placé à son altitude), seules x et z changent.
export const versLocal = (x, y) => ({ x: x - CENTRE.x, z: y - CENTRE.y });
