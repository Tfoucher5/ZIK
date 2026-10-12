export const jsonLdPage = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Guide complet — Blind Test ZIK",
  url: "https://www.zik-music.fr/docs",
  description:
    "Guide complet du blind test ZIK : comment jouer, système de points, Mode Salon Kahoot-like, import Deezer, classement ELO, FAQ.",
  inLanguage: "fr-FR",
  isPartOf: {
    "@type": "WebSite",
    url: "https://www.zik-music.fr/",
    name: "ZIK",
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: "https://www.zik-music.fr/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Documentation",
        item: "https://www.zik-music.fr/docs",
      },
    ],
  },
});

export const jsonLdFaq = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Qu'est-ce que Zikle ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Zikle est le jeu quotidien de ZIK : une seule chanson par jour, la même pour tous les joueurs, à deviner en 6 essais maximum. L'extrait audio s'allonge à chaque erreur (1s, 2s, 4s, 7s, 11s puis 16s). Il se joue seul, gratuitement et sans compte, avec un nouveau titre chaque jour à minuit heure de Paris.",
      },
    },
    {
      "@type": "Question",
      name: "Faut-il un compte pour jouer à Zikle ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Non pour le Zikle du jour, accessible librement sans inscription. Un compte gratuit est nécessaire uniquement pour rejouer les journées passées dans les archives, apparaître au classement du jour et conserver durablement sa série. Sans compte, la progression reste stockée dans le navigateur utilisé.",
      },
    },
    {
      "@type": "Question",
      name: "D'où viennent les chansons de Zikle ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Les titres sont tirés du top Deezer, rafraîchi automatiquement chaque semaine : uniquement des morceaux populaires, jamais des titres obscurs. Un même titre ne peut pas revenir avant 365 jours, ce qui évite toute répétition sur une année.",
      },
    },
    {
      "@type": "Question",
      name: "Faut-il un compte pour jouer au blind test sur ZIK ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Non, le mode invité permet de jouer immédiatement sans inscription, juste avec un pseudo. Créer un compte gratuit vous donne accès au classement ELO, aux statistiques personnelles et aux playlists personnalisées.",
      },
    },
    {
      "@type": "Question",
      name: "Comment rejoindre une partie de blind test en ligne sur ZIK ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Deux façons : rejoindre une room officielle depuis la page d'accueil en cliquant sur JOUER, ou entrer un code de room partagé par un ami. Aucune installation requise, tout se passe dans le navigateur.",
      },
    },
    {
      "@type": "Question",
      name: "Comment fonctionne le système de points au blind test ZIK ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "En mode texte libre : Artiste trouvé = 1 pt + bonus vitesse, Titre trouvé = 1 pt + bonus vitesse. Le bonus vitesse va de +3 pts en moins de 3 secondes à 0 pt après 18 secondes. En Mode Salon QCM : entre 1 000 pts (réponse immédiate) et 200 pts (dernière seconde), selon la rapidité.",
      },
    },
    {
      "@type": "Question",
      name: "Qu'est-ce que le Mode Salon de ZIK ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le Mode Salon est un blind test à la Kahoot conçu pour les soirées, événements et salles de classe. L'hôte projette un écran de contrôle sur TV, et chaque joueur participe sur son smartphone via un QR code ou un code court. Disponible en mode texte libre ou QCM avec 4 boutons colorés.",
      },
    },
    {
      "@type": "Question",
      name: "Comment importer une playlist Deezer sur ZIK ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rendez-vous sur la page Playlists, cliquez sur Nouvelle playlist, puis collez le lien de votre playlist Deezer (format : https://www.deezer.com/fr/playlist/...). Les titres sont importés automatiquement. Vous pouvez ensuite créer une room de blind test basée sur cette playlist et la partager.",
      },
    },
    {
      "@type": "Question",
      name: "La saisie au blind test ZIK est-elle sensible aux accents et aux fautes de frappe ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Non ! Le moteur de détection ignore les accents, les majuscules et tolère les petites fautes de frappe grâce à un algorithme de similarité. beyonce sera accepté pour Beyoncé, Pokr Face pour Poker Face.",
      },
    },
    {
      "@type": "Question",
      name: "Comment fonctionne le classement ELO sur ZIK ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ZIK utilise un vrai système ELO pairwise : à la fin de chaque partie, vous êtes comparé individuellement à chaque adversaire. Battre un joueur mieux classé rapporte beaucoup, perdre contre un joueur moins bien classé coûte cher. L'ELO n'évolue que dans les rooms publiques avec au moins 3 joueurs. Il existe aussi un classement hebdomadaire qui repart à zéro chaque lundi.",
      },
    },
    {
      "@type": "Question",
      name: "Comment supprimer mon compte ZIK ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Vous pouvez supprimer votre compte directement depuis vos Paramètres (section Zone dangereuse). La suppression est immédiate et irréversible : profil, playlists, scores et toutes vos données sont effacés instantanément.",
      },
    },
  ],
});
