// Mur d'actualité — entrées affichées sur /nouveautes (la plus récente en premier).
// tag : 'Nouveauté' | 'Amélioration' | 'Correctif'

export const NEWS = [
  {
    date: "2026-08-05",
    version: "3.2.0",
    tag: "Nouveauté",
    title: "Zikle — la chanson du jour",
    items: [
      "Nouveau jeu quotidien solo : une seule chanson par jour, la même pour tout le monde, à deviner en 6 essais. L'extrait démarre à 1 seconde et s'allonge à chaque erreur (1s, 2s, 4s, 7s, 11s, 16s).",
      "Jouable sans compte : le Zikle du jour est accessible librement, comme le reste du site en mode invité.",
      "Les titres sont tirés du top Deezer, rafraîchi chaque semaine — que des morceaux qui ont marché, et jamais deux fois le même titre avant 365 jours.",
      "Chaque essai indique clairement son état : trouvé, raté (avec la proposition faite) ou passé.",
      "Réglage du volume directement sous le lecteur, mémorisé d'une partie à l'autre.",
      "Série de jours gagnés d'affilée, classement du jour pour les joueurs connectés, et partage d'une grille d'emojis sans spoiler.",
      "Archives : rejoue les journées passées avec un compte gratuit. Les jours déjà terminés y affichent ton score.",
      "Zikle est accessible depuis la navigation du site, en haut sur ordinateur et dans la barre du bas sur mobile.",
    ],
  },
  {
    date: "2026-07-11",
    version: "3.0.0",
    tag: "Nouveauté",
    title: "ZIK v3 — Nouvelle interface",
    items: [
      "Refonte graphique complète du site : accueil, rooms, classements, playlists, profil, connexion, documentation et Mode Salon (nouvelle ambiance scène de festival côté hôte).",
      "Amis et abonnements : suis un profil librement ou envoie une demande d'ami (confirmée des deux côtés). Les demandes reçues s'acceptent depuis ton profil ou tes notifications.",
      "Ajoute un joueur en ami directement pendant une partie (menu ⋯ du classement) et invite tes amis dans ta room en un clic (bouton 👋 en haut de l'écran de jeu).",
      "Page d'accueil : les rooms avec des joueurs en ligne sont mises en avant dans une section « En direct », et des onglets Classique / QCM permettent de choisir son mode.",
      "La synchronisation de la musique entre joueurs a été renforcée : reprise au bon endroit après reconnexion et recalage automatique en cas de dérive.",
      "Mode Salon : barre de volume directement dans l'en-tête de l'écran hôte, et boutons de retour vers l'accueil sur toutes les pages Salon.",
      "Mot de passe oublié : un lien sur la fenêtre de connexion permet de recevoir un email de réinitialisation.",
      "En jeu sur mobile : le chrono du disque est plus lisible et n'apparaît plus avant le début de la partie.",
      "La fenêtre d'invitation d'un ami affiche les rooms en grille compacte, bien plus lisible sur PC comme sur mobile.",
      "Rooms améliorées : description en textarea, sélecteur de playlists retravaillé, et liaison Discord rafraîchie sans recharger la page.",
      "Divers correctifs : bouton Retour cliquable sur la Documentation, saisie du code room plus confortable sur mobile, page Profil hors connexion mieux espacée.",
      "Documentation enrichie (section Amis & invitations) et fichiers légaux mis à jour (fonctionnalités sociales, Bot Discord, publicité).",
    ],
  },
  {
    date: "2026-06-11",
    version: "2.7.0",
    tag: "Nouveauté",
    title: "Profil repensé : onglets, stats par mode et Early Adopter",
    items: [
      "Le profil est maintenant organisé en onglets : 📊 Statistiques et 🏅 Succès.",
      "Les statistiques séparent enfin le mode Classique et le mode QCM : plus de scores mélangés !",
      "Le succès 🌟 Early Adopter est attribué automatiquement à tous les comptes créés avant le 1er juin 2026. Merci les précurseurs !",
    ],
  },
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
