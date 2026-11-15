// ZIK Pro : ce que la version gratuite du mode salon permet, et les formules.
// Partagé client (affichage des verrous) et serveur (seul juge des limites).

export const FREE_MAX_PLAYERS = 12;
export const FREE_MAX_TEAMS = 2;
// Plus gros salon tenu à chaque passage du test de charge (scripts/charge-salon.mjs)
export const TESTED_PLAYERS = "2\u00a0000";
// Toujours « simulés » : aucune vraie salle de cette taille n'a été mesurée (/docs#capacite)
export const TESTED_LABEL = `testé à ${TESTED_PLAYERS} joueurs simulés`;

// Ce que débloque n'importe quelle formule Pro
export const PRO_PERKS = [
  `Pas de limite de joueurs imposée, ${TESTED_LABEL} dans un salon`,
  "Plus d'équipes, renommables",
  "Classement de la soirée et podium final",
  "Mode buzzer : l'animateur valide les réponses à voix haute",
  "Manches spéciales au hasard : points doubles, intro éclair, sprint",
  "Régie complète sur un second écran",
  "Révéler, terminer, corriger les points à tout moment",
  "Volume de la TV réglé depuis la régie",
  "Réglages modifiables en pleine partie",
];

export const PLANS = [
  {
    id: "night",
    name: "Soirée 24 h",
    price: "7,90 €",
    period: "une fois, ZIK Pro pendant 24 h",
    pitch: "Camping, anniversaire, séminaire : une date, un événement.",
    perks: [
      "Paiement unique, aucun abonnement",
      "24 h de ZIK Pro dès le paiement",
      "Autant de parties que vous voulez",
    ],
    badge: "Une date",
    cta: "Prendre la Soirée 24 h",
  },
  {
    id: "monthly",
    name: "Mensuel",
    price: "19 €",
    period: "par mois, sans engagement",
    pitch: "Pour un bar qui fait son blind test chaque semaine.",
    perks: [
      "Toutes les soirées du mois",
      "Résiliable en un clic, à tout moment",
      "Une facture chaque mois",
    ],
    featured: true,
    badge: "Pour les bars",
    cta: "S'abonner au mois",
  },
  {
    id: "yearly",
    name: "Annuel",
    price: "190 €",
    period: "par an, soit 15,83 € par mois",
    pitch: "Pour les lieux réguliers et les associations.",
    perks: [
      "Toutes les soirées de l'année",
      "Une seule facture pour l'année",
      "Résiliable, actif jusqu'au bout de l'année payée",
    ],
    badge: "2 mois offerts",
    cta: "S'abonner à l'année",
  },
];

// Fonctions Pro annoncées, pas encore construites
export const PRO_COMING = [
  "L'écran TV aux couleurs du lieu : logo, couleurs, message d'accueil",
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
  night: "Le classement de toute la soirée, partie après partie",
  buzzer: "Le mode buzzer, avec l'animateur qui valide les réponses",
  specials: "Les manches spéciales tirées au hasard",
};

export const PRIX_SOIREE = PLANS.find((p) => p.id === "night").price;
