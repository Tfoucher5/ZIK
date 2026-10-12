import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from "$lib/proPlans.js";

const SITE = "https://www.zik-music.fr";

// Affichée sur la page ET envoyée à Google : les deux doivent rester identiques
export const FAQ_GROUPS = [
  {
    title: "Pour jouer",
    items: [
      {
        q: "Comment fonctionne le Mode Salon ?",
        a: "L'hôte ouvre le salon sur l'ordinateur branché à la TV. Les joueurs scannent le QR code affiché à l'écran avec leur téléphone et choisissent un pseudo. La TV diffuse les extraits, le chrono et le classement, les téléphones servent de buzzers.",
      },
      {
        q: "Faut-il installer une application ?",
        a: "Non, ni pour l'hôte ni pour les joueurs : tout se passe dans le navigateur. Les joueurs n'ont pas besoin de créer de compte.",
      },
      {
        q: "Peut-on jouer en équipes ?",
        a: "Oui. L'hôte choisit le nombre d'équipes, chaque joueur rejoint la sienne depuis son téléphone. Le score d'une équipe est la moyenne de ses joueurs, pour que les petites équipes gardent leurs chances.",
      },
    ],
  },
  {
    title: "Pour organiser",
    items: [
      {
        q: "Peut-on utiliser ses propres musiques ?",
        a: "Oui : importez une playlist Deezer, ou choisissez une playlist officielle ZIK (chanson française, années 80, 2000, rap français, Disney…).",
      },
      {
        q: "Peut-on piloter la partie depuis un autre écran ?",
        a: "Oui. La régie s'ouvre sur un ordinateur ou une tablette à côté de la TV : pause, manche suivante, réglages et classement, sans que la salle ne voie rien.",
      },
      {
        q: "Et si la connexion est lente ?",
        a: "La musique de la manche suivante se charge pendant la manche en cours, pour éviter les temps morts. Un joueur qui perd le réseau retrouve sa place et ses points en revenant.",
      },
    ],
  },
  {
    title: "Tarifs",
    items: [
      {
        q: "Combien de joueurs peuvent participer ?",
        a: `Jusqu'à ${FREE_MAX_PLAYERS} joueurs et ${FREE_MAX_TEAMS} équipes en version gratuite. ZIK Pro accueille un nombre illimité de joueurs et jusqu'à 8 équipes.`,
      },
      {
        q: "Combien ça coûte ?",
        a: `Le Mode Salon est gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs. Pour les bars, campings et événements, ZIK Pro coûte 7,90 € la soirée, 19 € par mois ou 190 € par an.`,
      },
    ],
  },
];
const SALON_FAQ = FAQ_GROUPS.flatMap((g) => g.items);

export const STEPS = [
  [
    "Ouvrez le salon",
    "sur l'ordinateur branché à la TV, choisissez la musique.",
  ],
  [
    "Les invités scannent le QR code",
    "avec leur téléphone, sans appli ni compte.",
  ],
  [
    "Jouez",
    "ZIK diffuse, vérifie les réponses, compte les points et affiche le podium.",
  ],
];

export const OCCASIONS = [
  ["soiree", "Soirée entre amis"],
  ["bar", "Bar et restaurant"],
  ["camping", "Camping"],
  ["entreprise", "Team building"],
  ["anniversaire", "Anniversaire"],
  ["mariage", "Mariage"],
];

export const salonJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "ZIK Mode Salon",
      url: `${SITE}/salon`,
      description:
        "Blind test de soirée : la TV diffuse la musique et le classement, les joueurs répondent depuis leur téléphone, en solo ou en équipes.",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      inLanguage: "fr-FR",
      offers: [
        { "@type": "Offer", name: "Gratuit", price: "0", priceCurrency: "EUR" },
        {
          "@type": "Offer",
          name: "ZIK Pro Soirée",
          price: "7.90",
          priceCurrency: "EUR",
        },
        {
          "@type": "Offer",
          name: "ZIK Pro Mensuel",
          price: "19.00",
          priceCurrency: "EUR",
        },
        {
          "@type": "Offer",
          name: "ZIK Pro Annuel",
          price: "190.00",
          priceCurrency: "EUR",
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blind test en soirée",
          item: `${SITE}/salon`,
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: SALON_FAQ.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
});
