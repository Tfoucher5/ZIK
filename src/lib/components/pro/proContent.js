import {
  FREE_MAX_PLAYERS,
  FREE_MAX_TEAMS,
  TESTED_LABEL,
  PRIX_SOIREE,
} from "../../data/proPlans.js";

// free : null = la fonction n'existe pas en gratuit ; ok : coche verte devant
export const COMPARE = [
  {
    k: "Joueurs par salon",
    free: `jusqu'à ${FREE_MAX_PLAYERS}`,
    pro: `Pas de limite de joueurs, ${TESTED_LABEL}`,
  },
  {
    k: "Équipes",
    free: `${FREE_MAX_TEAMS} équipes`,
    pro: `Plus de ${FREE_MAX_TEAMS}, renommables, joueurs déplaçables`,
  },
  {
    k: "Façons de répondre",
    free: "Texte libre, 4 choix",
    freeOk: true,
    pro: "+ buzzer, l'animateur valide",
  },
  {
    k: "Manches spéciales",
    free: null,
    pro: "Points doubles, intro éclair, sprint",
  },
  {
    k: "Classement",
    free: "Partie par partie",
    freeOk: true,
    pro: "Cumulé sur la soirée, podium final",
  },
  {
    k: "Régie sur un second écran",
    free: "Lancer, pause, manche suivante, exclure un joueur",
    freeOk: true,
    pro: "+ révéler, terminer, corriger les points, volume de la TV",
  },
  {
    k: "Changer les réglages",
    free: "Entre deux parties",
    pro: "À tout moment, même en pleine partie",
  },
  {
    k: "Prix",
    free: "0 €, sans carte",
    pro: `Dès ${PRIX_SOIREE} la soirée`,
    proNoCheck: true,
  },
];

export const FAQ = [
  {
    q: "Combien de joueurs en même temps ?",
    a: `Jusqu'à ${FREE_MAX_PLAYERS} en gratuit. Avec ZIK Pro, pas de limite de joueurs, ${TESTED_LABEL} dans un salon. Chacun joue sur son téléphone, sans rien installer.`,
  },
  {
    q: "Faut-il un compte pour payer ?",
    a: "Oui : ZIK Pro s'active sur votre compte ZIK. Vos clients, eux, n'ont jamais besoin de compte : un code et un pseudo suffisent.",
  },
  {
    q: "Puis-je avoir une facture au nom du bar ?",
    a: "Oui. Sur la page de paiement Stripe, indiquez le nom de l'établissement, son adresse et, si vous en avez un, votre numéro de TVA. La facture arrive par e-mail.",
  },
  {
    q: "Comment résilier ?",
    a: "Sur cette page, connecté à votre compte, bouton « Gérer mon abonnement ». ZIK Pro reste actif jusqu'à la fin de la période déjà payée, puis plus rien n'est prélevé.",
  },
  {
    q: "Où retrouver mes factures ?",
    a: "Dans vos e-mails, et sur cette page tant que ZIK Pro est actif : bouton « Mes factures » ou « Gérer mon abonnement ».",
  },
  {
    q: "J'ai déjà une Soirée 24 h en cours, j'en reprends une ?",
    a: "La nouvelle Soirée 24 h s'ajoute à la suite : 24 h de plus après la fin de celle en cours. Utile seulement si votre événement dure plus longtemps.",
  },
  {
    q: "Le paiement est passé mais ZIK Pro n'est pas actif",
    a: "L'activation prend en général quelques secondes. Rechargez la page dans une minute. Si rien ne bouge, écrivez-nous : c'est réglé dans la journée, inutile de payer à nouveau.",
  },
];

export const LEAD = `La musique et le classement sur la TV, les réponses sur les téléphones de vos clients. Gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs, ZIK Pro dès ${PRIX_SOIREE} la soirée.`;

export const DESCRIPTION = `Blind test pour bar, camping, association ou entreprise : la musique et le classement sur la TV, les réponses sur les téléphones. Gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs, ZIK Pro dès ${PRIX_SOIREE} la soirée.`;

export const PAGE_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "ZIK Pro - le blind test qui fait la soirée, chez vous",
  description: DESCRIPTION,
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
        name: "ZIK Pro",
        item: "https://www.zik-music.fr/pro",
      },
    ],
  },
});

export const FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
});
