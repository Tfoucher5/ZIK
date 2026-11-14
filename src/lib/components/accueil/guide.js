import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from "../../data/proPlans.js";

export const UNIVERS = [
  {
    titre: "Blind test en ligne",
    texte:
      "Rejoins une room publique par thème (années 80, rap français, Disney…) et affronte d'autres joueurs en direct, ou crée une room privée avec tes playlists Deezer et partage son code à tes amis. Chaque jour, le Zikle propose une chanson à deviner en 6 essais. Avec un compte gratuit, tu grimpes au classement ELO et tu débloques des succès.",
    liens: [
      ["/rooms", "Rooms de blind test"],
      ["/zikle", "Zikle du jour"],
      ["/blind-test", "Blind test par thème"],
      ["/playlists", "Playlists"],
      ["/classements", "Classements"],
    ],
  },
  {
    titre: "Blind test en soirée",
    texte: `Pour une soirée entre amis, un anniversaire, un bar, un camping, une entreprise ou une association : la TV diffuse la musique et le classement, les invités scannent le QR code et répondent sur leur téléphone, en solo ou en équipes. Aucune application à installer, aucun compte pour les joueurs, gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs.`,
    liens: [
      ["/soiree", "Découvrir ZIK Soirée"],
      ["/salon", "Créer une soirée"],
      ["/salon/play", "Rejoindre une soirée"],
      ["/pro", "ZIK Pro pour les lieux"],
    ],
  },
];

export const FAQ = [
  {
    q: "Quelle différence entre le blind test en ligne et en soirée ?",
    a: "En ligne, chacun joue depuis son appareil contre d'autres joueurs, où qu'ils soient. En soirée, tout le monde est dans la même pièce : la musique sort de la TV et chaque téléphone sert de manette.",
  },
  {
    q: "Faut-il installer une application ?",
    a: "Non. ZIK fonctionne dans le navigateur, sur ordinateur, tablette et téléphone. En soirée, les invités rejoignent en scannant le QR code affiché sur la TV.",
  },
  {
    q: "Combien coûte ZIK, en ligne et en soirée ?",
    a: `Rien pour jouer en ligne, avec ou sans compte. En soirée, c'est gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs et ${FREE_MAX_TEAMS} équipes ; ZIK Pro lève ces limites pour les lieux qui reçoivent du public.`,
  },
  {
    q: "Où trouver le code d'une partie ?",
    a: "En soirée, le code de 6 caractères est affiché en grand sur la TV, à côté du QR code. Pour une room privée en ligne, c'est la personne qui l'a créée qui le partage. Dans les deux cas, il se tape dans le champ « J'ai un code » en haut de cette page.",
  },
];

export const faqJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
});
