// ZIK Pro : ce que la version gratuite du mode salon permet, et les formules.
// Partagé client (affichage des verrous) et serveur (seul juge des limites).

export const FREE_MAX_PLAYERS = 12;
export const FREE_MAX_TEAMS = 2;

export const PLANS = [
  {
    id: "night",
    name: "Soirée",
    price: "7,90 €",
    period: "HT, valable 24 h",
    pitch: "Une date, un événement : camping, anniversaire, séminaire.",
  },
  {
    id: "monthly",
    name: "Mensuel",
    price: "19 €",
    period: "HT par mois, sans engagement",
    pitch: "Pour un bar qui fait son blind test chaque semaine.",
    featured: true,
  },
  {
    id: "yearly",
    name: "Annuel",
    price: "190 €",
    period: "HT par an, 2 mois offerts",
    pitch: "Pour les lieux réguliers et les associations.",
  },
];

// Fonctions Pro annoncées, pas encore construites
export const PRO_COMING = [
  "L'écran TV aux couleurs du lieu : logo, couleurs, message d'accueil",
  "Manches spéciales : points doubles, intros de 3 secondes, « qui chante ? »",
  "Export des scores et historique de vos soirées",
  "Soirées programmées et inscription des équipes à l'avance",
];

// Fonctions verrouillées en gratuit, avec le texte montré à l'hôte
export const PRO_FEATURES = {
  players: `Plus de ${FREE_MAX_PLAYERS} joueurs dans le salon`,
  teams: `Plus de ${FREE_MAX_TEAMS} équipes`,
  reveal: "Révéler la réponse à tout moment",
  endGame: "Terminer la partie en cours",
  score: "Corriger les points à la main",
  volume: "Régler le son de la TV depuis la régie",
  liveSettings: "Changer les réglages en pleine partie",
  teamEdit: "Renommer les équipes et déplacer les joueurs",
};
