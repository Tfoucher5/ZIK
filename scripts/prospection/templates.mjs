// Mails de prospection, en texte brut : un mail perso, pas une newsletter.

const FOOTER = `--
J'ai trouvé votre adresse sur OpenStreetMap. Si vous ne souhaitez plus recevoir de message de ma part, répondez simplement « stop ».`;

const SIGNATURE = `Théo
ZIK - https://www.zik-music.fr`;

const PITCH = {
  bar: {
    subject: (name) => `Un blind test chez ${name} ?`,
    hook: "un blind test pensé pour les bars",
    use: "Ça peut animer un soir de semaine, un afterwork ou une soirée à thème.",
  },
  camping: {
    subject: () => "Une soirée blind test au camping cet été ?",
    hook: "un blind test pensé pour les soirées de camping",
    use: "Ça se lance en quelques minutes au bar du camping ou dans la salle d'animation, pour les familles comme pour les ados.",
  },
  association: {
    subject: () => "Un blind test pour votre association ?",
    hook: "un blind test pensé pour les soirées entre adhérents",
    use: "Ça marche pour une fête de village, une soirée d'adhérents ou un loto qui veut changer un peu, de 8 à 80 ans.",
  },
};

export function firstMail({ kind, name }) {
  const p = PITCH[kind];
  return {
    subject: p.subject(name),
    text: `Bonjour,

Je m'appelle Théo, je suis étudiant à Angers et passionné de musique. Sur mon temps libre, je développe ZIK, ${p.hook} : la TV diffuse les extraits, les joueurs répondent depuis leur téléphone en scannant un QR code, en solo ou en équipes, avec un classement en direct. Pas d'appli à installer, pas besoin d'animateur.

${p.use}

Je vous écris surtout pour avoir l'avis de personnes qui organisent vraiment des soirées. Si vous avez dix minutes pour l'essayer (c'est gratuit jusqu'à 8 joueurs), votre retour m'aiderait beaucoup, même s'il est critique. Et si un jour ça vous sert pour une vraie soirée, tant mieux !

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

Je me permets une seule relance au sujet de ZIK, le blind test que je développe. Si vous avez cinq minutes pour y jeter un œil, même un avis rapide m'aiderait à améliorer le projet : https://www.zik-music.fr/pro

Et si ce n'est pas le moment, aucun souci, je ne vous relancerai pas.

Belle journée,
${SIGNATURE}

${FOOTER}`,
  };
}
