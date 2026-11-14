// Textes de la vitrine /soiree (fiche docs/specs/2026-11-14-deux-univers.md)
import {
  FREE_MAX_PLAYERS,
  FREE_MAX_TEAMS,
  PLANS,
} from "../../data/proPlans.js";

const SITE = "https://www.zik-music.fr";

// Le déroulé d'une soirée, heure par heure
export const DEROULE = [
  {
    time: "19:45",
    title: "Ouvrez la soirée sur la TV",
    text: "Depuis l'ordinateur relié à la TV ou au vidéoprojecteur, choisissez une playlist et lancez le salon. Un QR code et un code de 6 caractères s'affichent.",
  },
  {
    time: "20:00",
    title: "Vos invités rejoignent",
    text: "Ils scannent le QR code ou tapent le code, puis choisissent un pseudo et leur équipe. Rien à télécharger, aucun compte demandé.",
  },
  {
    time: "20:10",
    title: "La partie tourne",
    text: "La TV passe les extraits, le chrono et le classement. Les téléphones servent de manettes, en texte libre ou parmi 4 choix, et ne montrent jamais la réponse avant la TV. Vous gardez la main depuis la régie.",
  },
  {
    time: "22:30",
    title: "Le podium",
    text: "Le classement final s'affiche sur grand écran, en solo ou par équipes. Un joueur qui a perdu le réseau en route a retrouvé sa place et ses points.",
  },
];

export const POUR_QUI = [
  [
    "Bar",
    "La partie tourne sur la TV, les clients jouent sur leur téléphone. Vous annoncez le thème, ZIK fait le reste.",
  ],
  [
    "Camping",
    "Une animation du soir sur l'écran de la salle commune, sans matériel en plus. Le passe Soirée suffit pour une date.",
  ],
  [
    "Entreprise",
    "Un temps d'équipe qui ne ressemble pas à une réunion. À distance aussi : partagez l'écran de la TV en visio et donnez le code.",
  ],
  [
    "Association",
    "Une animation sans budget ni matériel particulier. Les 4 choix aident quand les âges et les niveaux se mélangent.",
  ],
  [
    "Chez soi",
    `Anniversaire, soirée entre amis : importez une playlist Deezer et jouez-la en quelques minutes. Gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs.`,
  ],
];

export const PRIX_SOIREE = PLANS[0].price;

export const FAQ = [
  {
    q: "Faut-il installer quelque chose ?",
    a: "Non. Tout se passe dans le navigateur, sur la TV comme sur les téléphones.",
  },
  {
    q: "Les joueurs doivent-ils créer un compte ?",
    a: "Non : un code et un pseudo suffisent. Un compte garde leurs soirées sur leur profil.",
  },
  {
    q: "Et si la connexion coupe ?",
    a: "Un joueur garde sa place 10 minutes et revient avec ses points. Si la TV et la régie sont fermées, le salon attend 10 minutes en pleine partie, 2 heures entre deux parties.",
  },
  {
    q: "Quel matériel prévoir ?",
    a: "Un écran relié à un ordinateur, du son, une connexion correcte pour l'ordinateur, et un téléphone par joueur. Si votre Wi-Fi est modeste, conseillez la 4G ou la 5G.",
  },
  {
    q: "C'est payant ?",
    a: `Gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs et ${FREE_MAX_TEAMS} équipes. ZIK Pro débloque le reste, dès ${PRIX_SOIREE} la soirée.`,
  },
];

export const soireeJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "ZIK Soirée",
          item: `${SITE}/soiree`,
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
});
