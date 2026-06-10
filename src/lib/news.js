// Mur d'actualité — entrées affichées sur /nouveautes (la plus récente en premier).
// tag : 'Nouveauté' | 'Amélioration' | 'Correctif'

export const NEWS = [
  {
    date: "2026-06-10",
    version: "2.6.0",
    tag: "Nouveauté",
    title: "Succès, séries de jeu et scores partageables",
    items: [
      "Nouveau système de succès : 10 succès à débloquer (bronze, argent, or) visibles sur ton profil.",
      "Séries de jeu : enchaîne les jours de jeu et les victoires pour faire grimper tes records 🔥",
      "Partage ton score en fin de partie avec un lien public à envoyer à tes amis.",
      "Nouvelle page Nouveautés (celle que tu lis !) pour suivre les mises à jour du site.",
    ],
  },
  {
    date: "2026-06-04",
    version: "2.5.2",
    tag: "Correctif",
    title: "Playlists privées en Mode Salon",
    items: [
      "Les playlists privées ne sont plus proposées à la création d'un salon si elles ne t'appartiennent pas.",
      "Correction d'un crash rare côté serveur.",
    ],
  },
  {
    date: "2026-05-24",
    tag: "Correctif",
    title: "Sauvegarde des scores fiabilisée",
    items: [
      "Les points sont désormais sauvegardés manche par manche : plus de points perdus si tu quittes une partie en cours.",
      "Lecture audio réparée sur certaines musiques (recherche YouTube).",
      "Mises à jour de sécurité des dépendances.",
    ],
  },
  {
    date: "2026-05-14",
    version: "2.5.0",
    tag: "Nouveauté",
    title: "Page Classements & points en temps réel",
    items: [
      "Nouvelle page Classements : ELO, classement hebdomadaire et score total au même endroit.",
      "Les points gagnés sont ajoutés à ton profil en temps réel pendant la partie.",
      "Les previews audio Deezer se rafraîchissent automatiquement, même sans redémarrage du serveur.",
    ],
  },
  {
    date: "2026-05-06",
    tag: "Amélioration",
    title: "Refonte SEO du site",
    items: [
      "Pages repensées pour mieux présenter ZIK : accueil, documentation, comparatifs.",
      "Nouvelles pages de comparaison : ZIK vs Kahoot, ZIK vs Blinest, ZIK vs Blindtest.io.",
      "Meta descriptions dynamiques pour les rooms publiques.",
    ],
  },
  {
    date: "2026-04-26",
    version: "2.3.0",
    tag: "Correctif",
    title: "Audio : previews expirées réparées automatiquement",
    items: [
      "Les extraits musicaux dont le lien Deezer expirait deviennent silencieux : ils sont maintenant détectés et remplacés automatiquement.",
      "Filet de sécurité : si un extrait est indisponible, une source alternative est cherchée en direct.",
    ],
  },
  {
    date: "2026-04-25",
    tag: "Nouveauté",
    title: "Mode QCM multijoueur",
    items: [
      "Nouveau mode de jeu QCM dans les rooms multijoueur : 4 propositions, réponds le plus vite possible.",
      "Parfait pour découvrir le blind test sans connaître tous les titres par cœur.",
      "Chat en direct visible par les admins pour la modération.",
    ],
  },
  {
    date: "2026-04-14",
    tag: "Amélioration",
    title: "Refonte du profil et interface admin",
    items: [
      "Profil repensé : statistiques détaillées, historique de parties, profil public ou privé.",
      "Filtres et recherche améliorés sur la page Rooms.",
    ],
  },
  {
    date: "2026-04-03",
    tag: "Nouveauté",
    title: "Mode Salon : le blind test à la Kahoot",
    items: [
      "L'hôte diffuse la musique sur un grand écran, les joueurs répondent depuis leur téléphone via QR code.",
      "Mode texte libre ou QCM avec 4 boutons colorés.",
      "Idéal pour les soirées, anniversaires et événements.",
    ],
  },
];
