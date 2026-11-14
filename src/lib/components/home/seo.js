import { FAQ, GAME_FAQ } from "./faq.js";

const app = {
  "@context": "https://schema.org",
  "@type": ["WebApplication", "VideoGame"],
  name: "ZIK — Blind Test Musical",
  url: "https://www.zik-music.fr/",
  description:
    "Jeu de blind test musical multijoueur en ligne. Identifiez les chansons avant tout le monde, importez vos playlists Deezer, et grimpez au classement ELO. Gratuit, sans installation.",
  applicationCategory: "GameApplication",
  genre: ["Music", "Quiz", "Trivia"],
  operatingSystem: "Any",
  browserRequirements: "Navigateur web moderne (Chrome, Firefox, Safari, Edge)",
  inLanguage: "fr-FR",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  featureList: [
    "Blind test musical multijoueur en temps réel",
    "Import de playlists Deezer",
    "Mode Salon Kahoot-like (QCM sur smartphone)",
    "Classement ELO et statistiques joueur",
    "Rooms privées avec code partageable",
    "Mode invité sans inscription",
    "Playlists personnalisées partageables",
    "Détection intelligente des réponses (accents, fautes de frappe)",
  ],
  screenshot: "https://www.zik-music.fr/og.png?v=3.12.0",
  author: {
    "@type": "Organization",
    name: "ZIK",
    url: "https://www.zik-music.fr",
  },
};

export const jsonLd = JSON.stringify([
  app,
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ZIK",
    url: "https://www.zik-music.fr/",
    description: "Le blind test musical multijoueur gratuit en ligne.",
    inLanguage: "fr-FR",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.zik-music.fr/rooms?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ZIK",
    url: "https://www.zik-music.fr/",
    logo: "https://www.zik-music.fr/og.png?v=3.12.0",
    sameAs: ["https://github.com/Tfoucher5/ZIK"],
  },
]);

export const gameJsonLd = JSON.stringify({
  ...app,
  url: "https://www.zik-music.fr/jouer",
  featureList: app.featureList.filter((f) => !f.startsWith("Mode Salon")),
});

const faqLd = (items) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.ld ?? f.a },
    })),
  });

export const faqJsonLd = faqLd(FAQ);
export const gameFaqJsonLd = faqLd(GAME_FAQ);
