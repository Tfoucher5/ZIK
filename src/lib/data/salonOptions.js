// Choix proposés pour les réglages d'un salon (régie et admin)
export const SALON_ROUNDS = [5, 10, 15, 20];
export const SALON_DURATIONS = [15, 20, 30, 45, 60];
export const SALON_REVEALS = [5, 7, 10, 15];
export const SALON_TEAMS = [0, 2, 3, 4, 6, 8, 12, 16];
export const SALON_INTERMISSIONS = [0, 5, 10, 15, 20, 30];
// Annonce plein écran d'une manche spéciale, avant que la musique démarre
export const SPECIAL_INTRO_MS = 4000;
// Manches spéciales tirées au hasard (ZIK Pro)
export const SPECIALS = {
  double: { label: "Points doubles", hint: "Chaque bonne réponse vaut double" },
  flash: {
    label: "Intro éclair",
    hint: "La musique s'arrête au bout de 5 secondes",
  },
  sprint: { label: "Sprint", hint: "Deux fois moins de temps pour répondre" },
};
// Au-delà de 16 équipes, les couleurs reviennent dans le même ordre
const TEAM_COLORS = 16;
export const teamColor = (id) => `var(--q${id % TEAM_COLORS})`;
