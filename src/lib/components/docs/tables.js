import { RARITIES, RARITY_ORDER } from "$lib/components/card/rarity.js";

const kahootRows = (midLabel) => [
  ["Immédiatement (t = 0s)", "1 000 pts"],
  [midLabel, "~600 pts"],
  ["Dernière seconde", "200 pts"],
  ["Pas de réponse / réponse incorrecte", "0 pt"],
];
const kahootHead = ["Moment de réponse", "Points gagnés (si correct)"];

export const guestVsAccount = {
  head: ["Fonctionnalité", "Invité", "Compte"],
  rows: [
    ["Jouer en room officielle", "✅", "✅"],
    ["Jouer en room custom", "✅", "✅"],
    ["Score sauvegardé", "❌", "✅"],
    ["Classement ELO", "❌", "✅"],
    ["Profil public", "❌", "✅"],
    ["Créer une playlist", "❌", "✅"],
    ["Créer une room custom", "❌", "✅"],
    ["Mode Salon (hôte)", "❌", "✅"],
    ["Mode Salon (joueur)", "✅", "✅"],
  ],
};

export const basePoints = {
  head: ["Élément trouvé", "Points de base", "Bonus vitesse"],
  rows: [
    ["Artiste principal", "1 pt", "+ bonus (voir ci-dessous)"],
    ["Titre de la chanson", "1 pt", "+ bonus (voir ci-dessous)"],
    ["Artiste en featuring (par feat)", "1 pt", "+ bonus (voir ci-dessous)"],
    [
      "QCM Mode Salon (artiste + titre)",
      "200 – 1 000 pts",
      "Selon la vitesse de réponse (Kahoot-style)",
    ],
  ],
};

export const speedBonus = {
  head: ["Temps de réponse", "Bonus vitesse estimé"],
  rows: [
    ["0 – 3 secondes", "+3 pts"],
    ["3 – 8 secondes", "+2 pts"],
    ["8 – 18 secondes", "+1 pt"],
    ["18 secondes et plus", "+0 pt"],
  ],
};

export const salonKahoot = {
  head: kahootHead,
  rows: kahootRows("À mi-temps (ex : 15s sur 30s)"),
};

export const salonSettings = {
  head: ["Paramètre", "Valeurs possibles", "Défaut"],
  rows: [
    ["Durée d'une manche", "15 à 60 secondes", "30s"],
    ["Nombre de manches", "5 à 20", "10"],
    [
      "Mode de réponse",
      "Texte libre, QCM 4 choix ou buzzer (ZIK Pro)",
      "QCM 4 choix",
    ],
    ["Équipes", "Aucune, 2 (gratuit) ou autant que voulu (ZIK Pro)", "Aucune"],
    ["Manches spéciales", "Non / au hasard (ZIK Pro)", "Non"],
    ["Avance automatique", "Oui / Non (hôte clique manuellement)", "Oui"],
    ["Durée de révélation", "3 à 15 secondes", "7s"],
  ],
};

export const qcmShapes = {
  head: ["Forme", "Couleur", "Position"],
  rows: [
    ["▲ Triangle", "Rouge", "Haut gauche"],
    ["◆ Losange", "Bleu", "Haut droite"],
    ["● Cercle", "Jaune", "Bas gauche"],
    ["■ Carré", "Vert", "Bas droite"],
  ],
};

export const qcmKahoot = { head: kahootHead, rows: kahootRows("À mi-temps") };

export const classicVsQcm = {
  head: ["Fonctionnalité", "Classique", "QCM"],
  rows: [
    ["Mode de réponse", "Saisie texte libre", "4 boutons colorés"],
    ["Scoring", "Pts de base + bonus vitesse", "200 – 1 000 pts selon vitesse"],
    ["ELO", "✅ Oui (rooms publiques, 3+ joueurs)", "❌ Non"],
    ["Points hebdomadaires", "✅ Oui", "❌ Non"],
    [
      "Feats / artistes secondaires",
      "✅ Points séparés",
      "❌ Une seule réponse",
    ],
  ],
};

export const rarityConditions = {
  head: ["Rareté", "Condition en plus d'être premier"],
  rows: RARITY_ORDER.map((r) => {
    const e = RARITIES[r].exploit;
    const time = e.classic
      ? `Trouver en moins de ${e.classic / 1000} s (${e.qcm / 1000} s en QCM), `
      : "";
    const own = e.notOwnPlaylist ? ", jamais sur sa propre playlist" : "";
    return [RARITIES[r].label, `${time}${e.players} joueurs connectés${own}`];
  }),
};
