import {
  layout,
  kicker,
  title,
  paragraph,
  strong,
  button,
  small,
} from "./layout.js";

// Aux clients ZIK Pro : le support en direct arrive dans les salons (v3.15)
export function proSupportLaunch() {
  const points = [
    [
      "Appeler un admin",
      "Un bouton dans la régie et sur l'écran du salon prévient directement l'équipe ZIK.",
    ],
    [
      "Un chat en direct",
      "On vous répond dans un chat qui s'affiche sur votre écran, sans quitter la partie.",
    ],
    [
      "Un coup de main à distance",
      "Si besoin, on peut mettre en pause, passer un titre, corriger une vidéo ou ajuster les réglages pour vous.",
    ],
    [
      "Les clients Pro d'abord",
      "Vos demandes passent avant toutes les autres.",
    ],
  ];

  const html = layout({
    preheader:
      "Un souci pendant votre soirée ? Appelez un admin depuis le salon.",
    body: `
      ${kicker("ZIK Pro · Nouveau")}
      ${title("Une aide<br>en direct<br>pendant vos soirées.")}
      ${paragraph("Vous animez des blind tests avec ZIK Pro : merci ! Pour que vos soirées se passent sans accroc, le Mode Salon a maintenant un support en direct.")}
      ${points.map(([t, d]) => paragraph(`${strong(t)}<br>${d}`)).join("")}
      ${paragraph("La mise à jour apporte aussi les cartes musicales à collectionner et les notifications sur votre téléphone.")}
      ${button("https://www.zik-music.fr/nouveautes", "Voir les nouveautés")}
      ${small("Une question ? Répondez simplement à ce mail, je lis tout. Théo, créateur de ZIK")}
    `,
  });

  const text = [
    "Une aide en direct pendant vos soirées ZIK Pro.",
    "",
    ...points.map(([t, d]) => `- ${t} : ${d}`),
    "",
    "Toutes les nouveautés : https://www.zik-music.fr/nouveautes",
    "",
    "Une question ? Répondez à ce mail. Théo, créateur de ZIK",
  ].join("\n");

  return {
    subject: "Nouveau : une aide en direct dans vos salons ZIK Pro",
    html,
    text,
  };
}
