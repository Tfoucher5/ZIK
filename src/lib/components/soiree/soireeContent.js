// Textes de la vitrine /soiree (maquette validée par Théo le 15/11). Chaque
// chiffre vient des réglages ou des offres ; les défauts (10 manches de 30 s,
// révélation 7 s) sont ceux de createSalon (server/socket/salon/rooms.js).
import {
  FREE_MAX_PLAYERS,
  FREE_MAX_TEAMS,
  PLANS,
  PRIX_SOIREE,
  TESTED_LABEL,
} from "../../data/proPlans.js";
import { SALON_INTERMISSIONS, SALON_ROUNDS } from "../../data/salonOptions.js";

const SITE = "https://www.zik-music.fr";
const first = (a) => a[0];
const last = (a) => a[a.length - 1];
// 0 = pas d'entracte : la plage proposée commence au premier choix non nul
export const PAUSES = SALON_INTERMISSIONS.filter(Boolean);

export const CREER = "/salon";
// Nom du pass une date (« Soirée 24 h »), lu dans les offres
const NUIT = PLANS.find((p) => p.id === "night").name;

export const HERO = {
  lead: "La musique et le classement sur la TV, les réponses sur les téléphones. Vous lancez la partie en deux minutes, ZIK compte les points.",
  facts: [
    `Gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs`,
    "Rien à installer",
    "Sans compte pour jouer",
  ],
};

export const CAPTIONS = [
  {
    from: 0.17,
    to: 0.37,
    label: "La TV",
    title: "Pour toute la salle",
    text: "La musique, le chrono, qui a trouvé et en combien de temps, puis le classement. Lisible du fond de la salle.",
  },
  {
    from: 0.4,
    to: 0.59,
    label: "Le téléphone",
    title: "Pour chaque joueur",
    text: "Un QR code, un pseudo, et le téléphone devient une manette. Il ne montre jamais la réponse avant la TV.",
  },
  {
    from: 0.6,
    to: 0.79,
    label: "La régie",
    title: "Pour l'animateur",
    text: "Sur votre téléphone ou une tablette : pause, manche suivante, qui a répondu, qui a décroché. Révéler et terminer à tout moment avec",
    pro: true,
  },
  {
    from: 0.82,
    to: 1.1,
    label: "Trois écrans",
    title: "Une seule soirée",
    text: "Tout se parle en direct. Si un téléphone perd le réseau, il revient avec ses points.",
  },
];

export const FRISE = [
  {
    b: "En 2 minutes",
    t: "Lancer",
    p: "Choisissez la musique et le déroulé, puis «\u00a0Créer\u00a0». Sans compte.",
  },
  {
    b: "QR + code",
    t: "Rejoindre",
    p: "Les joueurs scannent le QR code de la TV avec leur téléphone.",
  },
  {
    b: "≈ 6 min",
    t: "Une partie",
    p: `10 manches de 30 secondes par défaut, de ${first(SALON_ROUNDS)} à ${last(SALON_ROUNDS)} manches au choix.`,
  },
  {
    b: "7 s",
    t: "Révélation",
    p: "Après chaque manche : la pochette, la réponse, les points.",
  },
  {
    b: "Fin",
    t: "Fin de partie",
    p: "Le vainqueur et ses trophées en grand sur la TV.",
  },
  {
    b: `${first(PAUSES)} à ${last(PAUSES)} min`,
    t: "On enchaîne",
    p: "Partie suivante, mêmes joueurs, avec un entracte si vous voulez.",
  },
  {
    b: "Podium",
    t: "Podium final",
    pro: true,
    p: "Le classement cumulé de toute la soirée.",
  },
];

export const KIT = [
  {
    i: "son",
    key: true,
    t: "Le son sort de l'ordinateur",
    p: "Pas des téléphones. Branchez l'ordinateur relié à la TV sur les enceintes de la TV ou sur la sono de la salle.",
  },
  {
    i: "ecran",
    t: "Un écran",
    p: "TV ou vidéoprojecteur, relié à un ordinateur.",
  },
  {
    i: "wifi",
    t: "Une connexion",
    p: "Correcte pour l'ordinateur. Les joueurs peuvent passer par la 4G ou la 5G.",
  },
  {
    i: "tel",
    t: "Un téléphone par joueur",
    p: "N'importe lequel, avec un navigateur. Pas d'appli.",
  },
  {
    i: "regie",
    t: "Une régie, si vous voulez",
    p: "Pilotez depuis votre téléphone ou une tablette. Sinon, tout se pilote depuis la TV.",
  },
];

// Formules payantes : nom, prix, période, badge et bouton viennent de proPlans
const PERKS = {
  night: [
    "Joueurs illimités",
    "Buzzer et manches spéciales",
    "Classement et podium de soirée",
  ],
  monthly: ["ZIK Pro tout le mois", "Joueurs illimités", "Sans engagement"],
  yearly: ["ZIK Pro toute l'année", "Joueurs illimités", "Une seule facture"],
};
export const OFFRES = [
  {
    id: "free",
    k: "once",
    badge: "Entre amis",
    name: "Gratuit",
    price: "0 €",
    period: "pour toujours",
    perks: [
      `Jusqu'à ${FREE_MAX_PLAYERS} joueurs`,
      `${FREE_MAX_TEAMS} équipes`,
      "Texte libre ou 4 choix",
    ],
    cta: "Créer une soirée",
    href: CREER,
  },
  ...PLANS.map(({ id, name, price, period, badge, cta, featured }) => ({
    id,
    k: id === "night" ? "once" : "often",
    name,
    price,
    period,
    badge,
    cta,
    top: !!featured,
    perks: PERKS[id],
    href: "/pro#tarifs",
  })),
];

export const OFFRES_NOTE = `ZIK Pro : joueurs illimités, ${TESTED_LABEL}.`;

export const FAQ = [
  {
    q: "D'où sort le son ?",
    a: "De l'ordinateur relié à la TV. Les téléphones des joueurs restent silencieux : branchez l'ordinateur sur les enceintes de la TV ou sur la sono.",
  },
  {
    q: "Faut-il un compte pour organiser ?",
    a: "Non pour une soirée gratuite. Un compte garde vos playlists importées et votre abonnement ZIK Pro.",
  },
  {
    q: "Sur quel appareil ouvrir la régie ?",
    a: "Votre téléphone, une tablette ou un autre ordinateur. Sans régie, tout se pilote depuis l'écran de la TV.",
  },
  {
    q: "Et si la connexion coupe ?",
    a: "Un joueur garde sa place 10 minutes et revient avec ses points. Sur un autre téléphone, il la récupère après l'accord de l'hôte. Si la TV et la régie sont fermées, la soirée attend 10 minutes en pleine partie, 2 heures entre deux parties.",
  },
  {
    q: "Combien de temps dure une partie ?",
    a: "Environ 6 minutes avec les réglages par défaut : 10 manches de 30 secondes, et la manche s'arrête dès que tout le monde a répondu. Vous enchaînez autant de parties que vous voulez dans le même salon.",
  },
  {
    q: "On peut couper le son ?",
    a: "Le buzz et le roulement de tambour se désactivent, et le son se coupe depuis la TV.",
  },
  {
    q: "C'est payant ?",
    a: `Gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs et ${FREE_MAX_TEAMS} équipes. ZIK Pro débloque le reste, dès ${PRIX_SOIREE} avec la ${NUIT}.`,
  },
];

export const DESC = `La musique et le classement sur la TV, les réponses sur les téléphones, sans appli. Gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs.`;

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
