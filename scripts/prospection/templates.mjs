// Mails de prospection, en texte brut : un mail perso, pas une newsletter.

import {
  FREE_MAX_PLAYERS,
  FREE_MAX_TEAMS,
} from "../../src/lib/data/proPlans.js";

const FOOTER = `--
J'ai trouvé votre adresse sur OpenStreetMap. Si vous ne souhaitez plus recevoir de message de ma part, répondez simplement « stop ».`;

const SIGNATURE = `Théo
ZIK - https://www.zik-music.fr`;

// Des lieux ont cru à une prestation d'animation : le mail dit dès l'objet et
// la première phrase que ZIK est un outil que le lieu lance lui-même.
const PITCH = {
  bar: {
    subject: (name) => `Un outil de blind test pour ${name} ?`,
    use: "Ça peut animer un soir de semaine, un afterwork ou une soirée à thème.",
  },
  camping: {
    subject: () => "Un outil de blind test pour vos soirées de camping ?",
    use: "Ça se lance en quelques minutes au bar du camping ou dans la salle d'animation, pour les familles comme pour les ados.",
  },
  association: {
    subject: () => "Un outil de blind test pour votre association ?",
    use: "Ça marche pour une fête de village, une soirée d'adhérents ou un loto qui veut changer un peu, de 8 à 80 ans.",
  },
};

export function firstMail({ kind, name }) {
  const p = PITCH[kind];
  return {
    subject: p.subject(name),
    text: `Bonjour,

Je m'appelle Théo, je suis étudiant à Angers et je développe ZIK, un site de blind test que vous lancez vous-même sur place, sans matériel à acheter. Je ne propose pas de prestation : personne ne se déplace, c'est vous qui gardez la main sur la soirée.

Comment ça marche : l'ordinateur relié à la TV (ou au vidéoprojecteur) diffuse les extraits, les joueurs répondent depuis leur téléphone en saisissant un code, en solo ou en équipes, avec un classement en direct. Pas d'appli à installer. La partie peut tourner toute seule, ou vous l'animez depuis une régie sur un second écran : lancer, révéler les réponses, corriger les points.

${p.use}

Je vous écris surtout pour avoir l'avis de personnes qui organisent vraiment des soirées. Vous pouvez l'essayer gratuitement, jusqu'à ${FREE_MAX_PLAYERS} joueurs et ${FREE_MAX_TEAMS} équipes : votre retour m'aiderait beaucoup, même s'il est critique. Pour une vraie soirée, ZIK Pro lève ces limites : 7,90 € la soirée, 19 € par mois ou 190 € par an, sans engagement.

Tout est expliqué ici : https://www.zik-music.fr/pro

Merci pour votre temps et bonne journée,
${SIGNATURE}

${FOOTER}`,
  };
}

export function followUp({ kind, name }) {
  return {
    subject: `Re: ${PITCH[kind].subject(name)}`,
    text: `Bonjour,

Je me permets une seule relance au sujet de ZIK, l'outil de blind test que je développe. Pour être clair : ce n'est pas une prestation d'animation, personne ne se déplace. C'est un site que vous lancez vous-même sur votre TV, et les joueurs répondent depuis leur téléphone. Si vous avez cinq minutes pour y jeter un œil, même un avis rapide m'aiderait à améliorer le projet : https://www.zik-music.fr/pro

Et si ce n'est pas le moment, aucun souci, je ne vous relancerai pas.

Belle journée,
${SIGNATURE}

${FOOTER}`,
  };
}
