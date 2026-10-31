import {
  layout,
  kicker,
  title,
  paragraph,
  strong,
  button,
  small,
} from "./layout.js";

// Aux clients ZIK Pro : la soirée complète dans un seul salon (v3.21)
export function proSoireeLaunch() {
  const points = [
    [
      "Le classement de la soirée",
      "Les points de chaque partie s'additionnent. Entre deux parties, la TV affiche le podium de la partie et le classement de toute la soirée, sans que personne ne ressaisisse de code.",
    ],
    [
      "Le mode buzzer",
      "Le premier qui buzze coupe la musique et répond à voix haute, vous validez depuis la régie. Le côté animateur, en plus simple.",
    ],
    [
      "Le podium final",
      "« Terminer la soirée » révèle le 3e, le 2e, puis le vainqueur après un roulement de tambour, sous les confettis.",
    ],
    [
      "Les manches spéciales",
      "Si vous les activez : points doubles, intro éclair ou sprint, tirés au hasard et annoncés en grand avant la musique.",
    ],
    [
      "Des équipes illimitées",
      "Une équipe par table, autant que vous voulez, chacune avec son nom.",
    ],
    [
      "Une musique plus fiable",
      "Tout est vérifié dès le lobby. Si une vidéo YouTube manque, la manche se joue avec l'extrait audio, et en cas de panne la partie se met en pause et repart toute seule.",
    ],
  ];

  const html = layout({
    preheader:
      "Toute la soirée dans le même salon : classement cumulé, buzzer, podium final.",
    body: `
      ${kicker("ZIK Pro · Mise à jour")}
      ${title("Toute votre<br>soirée dans<br>un seul salon.")}
      ${paragraph("Merci d'animer vos blind tests avec ZIK Pro ! Cette mise à jour est pensée pour vos soirées : on enchaîne les parties dans le même salon, et le Mode Salon devient un vrai jeu d'animateur.")}
      ${points.map(([t, d]) => paragraph(`${strong(t)}<br>${d}`)).join("")}
      ${paragraph("Et aussi : un entracte avec heure de reprise, la réponse masquée dans la régie, des sons de TV réglables et un fondu en fin de partie.")}
      ${button("https://www.zik-music.fr/nouveautes", "Voir les nouveautés")}
      ${small("Une question ou une idée ? Répondez simplement à ce mail, je lis tout et je réponds à chacun. Théo, créateur de ZIK")}
    `,
  });

  const text = [
    "Toute votre soirée dans un seul salon : les nouveautés de ZIK Pro.",
    "",
    ...points.map(([t, d]) => `- ${t} : ${d}`),
    "",
    "Toutes les nouveautés : https://www.zik-music.fr/nouveautes",
    "",
    "Une question ou une idée ? Répondez à ce mail. Théo, créateur de ZIK",
  ].join("\n");

  return {
    subject:
      "Nouveau dans ZIK Pro : buzzer, podium final et classement de la soirée",
    html,
    text,
  };
}
