// Choix proposés pour les réglages d'un salon (régie et admin)
export const SALON_ROUNDS = [5, 10, 15, 20];
export const SALON_DURATIONS = [15, 20, 30, 45, 60];
export const SALON_REVEALS = [5, 7, 10, 15];
export const SALON_TEAMS = [0, 2, 3, 4, 6, 8, 12, 16];
export const SALON_INTERMISSIONS = [0, 5, 10, 15, 20, 30];
// Décompte affiché sur la TV et les téléphones avant le lancement d'une partie
export const START_COUNTDOWN_S = 5;
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
// Mêmes couleurs que --q0…--q15 (static/css/salon/shared.css), pour un canvas qui ne lit pas le CSS
const TEAM_HEX = [
  "#ff4f9a",
  "#5bc0eb",
  "#f4e04d",
  "#3ddc84",
  "#8c7bff",
  "#ff8c42",
  "#2ec4b6",
  "#f2ede3",
  "#b8e986",
  "#3a6df0",
  "#ff6f61",
  "#c9a7ff",
  "#d4a017",
  "#9ef0d0",
  "#ffb3d1",
  "#9aa0a6",
];
export const teamHex = (id) => TEAM_HEX[id % TEAM_COLORS];
