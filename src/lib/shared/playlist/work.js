// Réponses qui désignent une œuvre : la trouver vaut toute la manche, et c'est
// elle qu'on affiche en premier (musique de film, générique de série…)
const WORK_TYPES = new Set(["Film", "Série", "Jeu vidéo", "Animé"]);
export const isWork = (label) => WORK_TYPES.has(label);
