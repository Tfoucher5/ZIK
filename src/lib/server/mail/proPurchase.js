import { PLANS, PRO_PERKS } from "../../proPlans.js";
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

const planOf = (id) => PLANS.find((p) => p.id === id);
const dateFr = (iso) =>
  new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

// Au client : ZIK Pro est actif, et comment s'en servir ce soir
export function proWelcome({ plan, periodEnd }) {
  const p = planOf(plan);
  const isNight = plan === "night";
  const perks = PRO_PERKS.map((c) => `&#8594;&nbsp; ${escapeHtml(c)}`).join(
    "<br>",
  );

  const html = layout({
    preheader: isNight
      ? `ZIK Pro est actif jusqu'au ${dateFr(periodEnd)}.`
      : "ZIK Pro est actif. Bonne soirée blind test !",
    body: `
      ${kicker(`ZIK Pro · ${p.name}`)}
      ${title("Merci !<br>ZIK Pro<br>est actif.")}
      ${paragraph("Le paiement est bien passé. Toutes les options Pro sont débloquées sur votre compte, il suffit d'ouvrir un salon en étant connecté.")}
      ${facts([
        ["Formule", `${p.name} - ${p.price}`],
        [
          isNight ? "Actif jusqu'au" : "Prochain renouvellement",
          dateFr(periodEnd),
        ],
        ["Reçu et facture", "Envoyés par Stripe dans un e-mail séparé"],
      ])}
      ${paragraph(`${strong("Ce qui est débloqué")}<br>${perks}`)}
      ${button("https://www.zik-music.fr/salon", "Ouvrir un salon")}
      ${paragraph(isNight ? "Le passe Soirée ne se renouvelle pas : aucun prélèvement ne suivra." : "Factures, carte bancaire et résiliation : tout se gère en un clic depuis la page ZIK Pro, bouton « Gérer mon abonnement ».")}
      ${small("Une question, un souci pendant la soirée ? Répondez simplement à ce mail, je lis tout. Théo, créateur de ZIK")}
    `,
  });

  const text = [
    "Merci ! ZIK Pro est actif.",
    "",
    `Formule : ${p.name} - ${p.price}`,
    `${isNight ? "Actif jusqu'au" : "Prochain renouvellement"} : ${dateFr(periodEnd)}`,
    "",
    "Ouvrez un salon en étant connecté : https://www.zik-music.fr/salon",
    "",
    "Une question ? Répondez à ce mail. Théo, créateur de ZIK",
  ].join("\n");

  return { subject: "ZIK Pro est actif", html, text };
}

// À Théo : une vente vient de tomber
export function proSaleAlert({ email, plan }) {
  const p = planOf(plan);
  const safeEmail = escapeHtml(email);
  const html = layout({
    preheader: `${safeEmail} a pris ZIK Pro ${p.name}`,
    body: `
      ${kicker("ZIK Pro · Nouvelle vente")}
      ${title(`${escapeHtml(p.name)}<br>${escapeHtml(p.price)}`)}
      ${facts([
        [
          "Client",
          `<a href="mailto:${safeEmail}" style="color:#ff00ff">${safeEmail}</a>`,
        ],
        ["Formule", `${p.name} (${p.price})`],
      ])}
      ${paragraph("Un petit mot de bienvenue perso fait souvent la différence. Réponds à ce mail : ta réponse part directement au client.")}
      ${button("https://dashboard.stripe.com/payments", "Ouvrir Stripe")}
    `,
  });
  return {
    subject: `ZIK Pro : ${email} a pris la formule ${p.name}`,
    html,
    text: `Nouvelle vente ZIK Pro\nClient : ${email}\nFormule : ${p.name} (${p.price})`,
    replyTo: email,
  };
}
