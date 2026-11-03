// Niveaux de santé, du meilleur au pire : sondes serveur, /statut, /admin/statut
export const LEVELS = ["ok", "suspect", "incident"];

export const LEVEL_TEXT = {
  ok: "Opérationnel",
  suspect: "Perturbé",
  incident: "Incident",
};

export function worst(levels) {
  return levels.reduce(
    (a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a),
    "ok",
  );
}
