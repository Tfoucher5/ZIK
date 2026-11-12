// Ce qui s'est passé dans un salon, pour l'admin qui aide un hôte en direct.
// Champ « _journal » : en mémoire seulement, hors instantané.
const MAX = 30;

export function note(salon, text) {
  const j = (salon._journal ??= []);
  j.unshift({ at: Date.now(), text });
  if (j.length > MAX) j.length = MAX;
}
