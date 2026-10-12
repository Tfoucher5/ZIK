import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from "$lib/proPlans.js";

export const COMPARE = [
  ["Joueurs par salon", `jusqu'à ${FREE_MAX_PLAYERS}`, "illimité"],
  ["Équipes", `jusqu'à ${FREE_MAX_TEAMS}`, "jusqu'à 8, renommables"],
  [
    "Régie sur un second écran",
    "lancer, pause, manche suivante, exclure un joueur",
    "tout : révéler, terminer, corriger les points, volume de la TV",
  ],
  ["Réglages en pleine partie", "entre deux parties", "à tout moment"],
];

export const ETAPES = [
  {
    n: "1",
    titre: "Ouvrez un salon sur l'écran",
    texte:
      "Depuis l'ordinateur relié à la TV ou au vidéoprojecteur, choisissez un thème et lancez le salon. Un code à 6 caractères s'affiche.",
  },
  {
    n: "2",
    titre: "Vos invités rejoignent",
    texte:
      "Ils ouvrent zik-music.fr sur leur téléphone, saisissent le code et leur pseudo. Rien à télécharger, rien à installer.",
  },
  {
    n: "3",
    titre: "La soirée se déroule seule",
    texte:
      "L'écran diffuse les extraits et le classement, les téléphones servent de manettes. Vous n'avez plus rien à animer.",
  },
];

export const USAGES = [
  {
    titre: "Bars et restaurants",
    texte:
      "Remplissez un mardi soir sans payer d'animateur. La partie tourne sur la TV, les clients jouent sur leur téléphone, vous n'avez qu'à annoncer le thème.",
  },
  {
    titre: "Associations et MJC",
    texte:
      "Une animation qui fonctionne de 12 à 77 ans, sans matériel spécifique et sans budget. Le Mode QCM évite d'avoir à taper au clavier.",
  },
  {
    titre: "Entreprises et CE",
    texte:
      "Un temps d'équipe qui ne ressemble pas à une réunion. Fonctionne aussi à distance : chacun rejoint le salon depuis chez lui.",
  },
  {
    titre: "Anniversaires, EVJF et EVG",
    texte:
      "Créez une playlist sur mesure à partir de Deezer et transformez-la en blind test en quelques minutes.",
  },
];

export const BESOINS = [
  "Un écran relié à un ordinateur : télévision, vidéoprojecteur ou simple moniteur",
  "Du son, idéalement autre chose que les haut-parleurs de l'écran",
  "Une connexion internet correcte pour l'ordinateur hôte",
  "Un téléphone par joueur, avec ou sans wifi",
];

export const TRUST = [
  ["Paiement sécurisé", "par Stripe : carte, Apple Pay, Google Pay"],
  ["Facture automatique", "envoyée par e-mail à chaque paiement"],
  ["Sans engagement", ": résiliation en un clic depuis cette page"],
];

export const FAQ = [
  [
    "Faut-il installer quelque chose ?",
    "Non, ni pour l'hôte ni pour les joueurs. Tout se passe dans le navigateur.",
  ],
  [
    "Mes clients doivent-ils créer un compte ?",
    "Non. Ils saisissent un code et un pseudo, c'est tout. Un compte ne sert qu'à conserver ses statistiques et son classement.",
  ],
  [
    "Et si la connexion coupe pendant la partie ?",
    "Un joueur déconnecté retrouve sa partie et ses points en rejoignant. Côté hôte, le salon reste ouvert quelques minutes le temps de revenir.",
  ],
  [
    "Peut-on jouer à distance ?",
    "Oui. Il suffit de partager l'écran de l'hôte en visio et de donner le code du salon.",
  ],
  [
    "Comment se passe le paiement ?",
    "Choisissez une formule, payez par carte, Apple Pay ou Google Pay sur la page sécurisée de Stripe, et ZIK Pro s'active tout de suite sur votre compte. Le reçu et la facture arrivent par e-mail.",
  ],
  [
    "Puis-je arrêter quand je veux ?",
    "Oui. Le passe Soirée ne se renouvelle jamais. Les abonnements se résilient en un clic depuis cette page : ZIK Pro reste actif jusqu'à la fin de la période déjà payée, sans autre prélèvement.",
  ],
  [
    "Puis-je afficher ZIK dans mon établissement ?",
    "Bien sûr, et ça fait plaisir. Écrivez-nous si vous voulez un visuel ou un QR code à imprimer pour vos tables.",
  ],
];

export const PAGE_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Organiser un blind test - ZIK pour les bars, associations et entreprises",
  description:
    "Animez une soirée blind test sans animateur : l'écran affiche la partie, vos invités jouent sur leur téléphone. Sans installation, gratuit jusqu'à 8 joueurs, ZIK Pro pour les bars et événements.",
  url: "https://www.zik-music.fr/pro",
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
        name: "Organiser un blind test",
        item: "https://www.zik-music.fr/pro",
      },
    ],
  },
});

const question = (name, text) => ({
  "@type": "Question",
  name,
  acceptedAnswer: { "@type": "Answer", text },
});

export const FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    question(
      "Combien de personnes peuvent jouer en même temps ?",
      "Jusqu'à 8 joueurs en version gratuite, sans limite avec ZIK Pro. Chacun joue sur son propre téléphone, il n'y a rien à installer.",
    ),
    question(
      "Faut-il créer un compte pour organiser une soirée ?",
      "Non. L'hôte lance un salon depuis un navigateur et les joueurs rejoignent avec un code. Aucune inscription n'est demandée.",
    ),
    question(
      "Est-ce que c'est payant ?",
      "Le Mode Salon est gratuit jusqu'à 8 joueurs et 2 équipes. ZIK Pro débloque les joueurs illimités, 8 équipes et la régie complète, dès 7,90 € la soirée.",
    ),
    question(
      "Quel matériel faut-il prévoir ?",
      "Un écran relié à un ordinateur, du son, une connexion internet correcte, et un téléphone par joueur.",
    ),
  ],
});
