import { PLANS, PRO_COMING, FREE_MAX_PLAYERS } from "../../proPlans.js";
import {
  layout,
  kicker,
  title,
  paragraph,
  strong,
  button,
  facts,
  small,
  escapeHtml,
} from "./layout.js";

const VENUE_LABELS = {
  bar: "Bar ou restaurant",
  camping: "Camping ou village vacances",
  association: "Association",
  entreprise: "Entreprise ou CE",
  autre: "Autre",
};

const planName = (id) => PLANS.find((p) => p.id === id);

// Au lieu : confirmation d'inscription, avec de quoi essayer dès ce soir
export function waitlistWelcome({ venue, plan }) {
  const p = planName(plan);
  const greeting = venue
    ? `${strong(escapeHtml(venue))} est bien inscrit sur la liste ZIK Pro.`
    : "Votre lieu est bien inscrit sur la liste ZIK Pro.";
  const coming = PRO_COMING.map((c) => `&#8594;&nbsp; ${escapeHtml(c)}`).join(
    "<br>",
  );

  const html = layout({
    preheader:
      "Vous serez prévenu en premier à l'ouverture de ZIK Pro. En attendant, le salon est gratuit jusqu'à 12 joueurs.",
    body: `
      ${kicker("ZIK Pro · Liste d'attente")}
      ${title("C'est noté,<br>vous êtes<br>sur la liste.")}
      ${paragraph(`${greeting} Vous serez prévenu en premier dès l'ouverture du paiement, et les premiers lieux inscrits pourront tester ZIK Pro en avant-première.`)}
      ${facts([
        [
          "Formule envisagée",
          p ? `${p.name} - ${p.price} ${p.period}` : "À définir",
        ],
        ["Avec ZIK Pro", "Joueurs illimités, 8 équipes"],
        ["Régie", "Complète, sur un second écran"],
      ])}
      ${paragraph(`${strong("Pas besoin d'attendre pour essayer :")} le Mode Salon est gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs. Branchez un ordinateur à la TV, ouvrez un salon, vos clients scannent le QR code.`)}
      ${button("https://www.zik-music.fr/salon", "Lancer une soirée test")}
      ${paragraph(`${strong("Bientôt dans ZIK Pro")}<br>${coming}`)}
      ${small("Une question, un besoin particulier ? Répondez simplement à ce mail, je lis tout. Théo, créateur de ZIK")}
    `,
  });

  const text = [
    "C'est noté, vous êtes sur la liste ZIK Pro.",
    "",
    `${venue ? venue + " est bien inscrit" : "Votre lieu est bien inscrit"}. Vous serez prévenu en premier dès l'ouverture du paiement.`,
    ...(p ? [`Formule envisagée : ${p.name} - ${p.price} ${p.period}`] : []),
    "",
    `En attendant, le Mode Salon est gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs : https://www.zik-music.fr/salon`,
    "",
    "Une question ? Répondez à ce mail. Théo, créateur de ZIK",
  ].join("\n");

  return {
    subject: "Vous êtes sur la liste ZIK Pro",
    html,
    text,
  };
}

// À Théo : un lieu à recontacter vite
export function waitlistAdminAlert({ email, venue, venueType, plan, total }) {
  const p = planName(plan);
  const safeEmail = escapeHtml(email);
  const html = layout({
    preheader: `${escapeHtml(venue || email)} veut ZIK Pro`,
    body: `
      ${kicker(`Liste d'attente · ${total} inscrit${total > 1 ? "s" : ""}`)}
      ${title("Un lieu veut<br>ZIK Pro.")}
      ${facts([
        ["Lieu", escapeHtml(venue || "Non renseigné")],
        ["Type", VENUE_LABELS[venueType] ?? "Non renseigné"],
        ["Formule", p ? `${p.name} (${p.price})` : "Non renseignée"],
        [
          "E-mail",
          `<a href="mailto:${safeEmail}" style="color:#ff00ff">${safeEmail}</a>`,
        ],
      ])}
      ${paragraph("Un lieu recontacté dans l'heure a bien plus de chances de devenir client. Réponds à ce mail : ta réponse part directement au lieu.")}
      ${button("https://www.zik-music.fr/admin/users", "Ouvrir l'admin")}
    `,
  });
  return {
    subject: `ZIK Pro : ${venue || email} s'est inscrit`,
    html,
    text: `Nouveau lieu sur la liste ZIK Pro\nLieu : ${venue || "-"}\nType : ${VENUE_LABELS[venueType] ?? "-"}\nFormule : ${p?.name ?? "-"}\nE-mail : ${email}\nInscrits : ${total}`,
    replyTo: email,
  };
}
