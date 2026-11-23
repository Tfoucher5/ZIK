const SAUF = "Personne ne perd sa place ni ses points.";

export const GARDE = "Ta place et tes points sont gardés.";

const secondes = (n) => {
  const v = Math.max(1, Math.round(Number(n) || 0));
  return `${v} seconde${v > 1 ? "s" : ""}`;
};

/** 'e1' | 'e2' | 'e3' | 'pause' | 'reseau' */
export function etatDe(mode, essai) {
  if (mode === "pause" || mode === "reseau") return mode;
  if (!(essai >= 2)) return "e1";
  return essai === 2 ? "e2" : "e3";
}

const TV = {
  e1: {
    titre: ["On retourne", "le disque."],
    texte: `La soirée reprend toute seule. ${SAUF}`,
  },
  e2: {
    titre: ["Encore", "un tour."],
    texte: `Le disque se remet en place. ${SAUF}`,
  },
  pause: {
    titre: ["Petite", "pause."],
    texte: `La soirée reprend dans un instant. ${SAUF}`,
    ligne: "Si l'écran reste ici, rechargez la page de la TV.",
  },
  reseau: {
    titre: ["Petite", "pause."],
    texte:
      "La TV attend le retour d'internet. La soirée reprend toute seule, personne ne perd ses points.",
    ligne: "Vérifiez la connexion de la TV.",
  },
};
TV.e3 = TV.e2;

const REGIE_ARRET =
  "La partie n'est pas arrêtée. La TV et les joueurs ne voient pas cet écran.";
const REGIE = {
  e1: {
    etiquette: "Relance",
    titre: "La régie redémarre.",
    texte: (n) => `Retour dans ${secondes(n)}, sans rien faire.`,
    essai: "Essai 1 sur 3",
  },
  e2: {
    etiquette: "Relance",
    titre: "Nouvel essai.",
    texte: (n) =>
      `La régie n'est pas repartie du premier coup. Retour dans ${secondes(n)}.`,
    essai: "Essai 2 sur 3",
  },
  e3: {
    etiquette: "Relance",
    titre: "Troisième essai.",
    texte: (n) => `Retour dans ${secondes(n)}. Ensuite, un essai par minute.`,
    essai: "Essai 3 sur 3",
  },
  pause: {
    etiquette: "Relance lente",
    titre: "La régie ne repart pas seule.",
    texte: () =>
      "Un essai par minute, sans rien faire. Tu peux aussi relancer toi-même.",
    essai: "Un essai par minute",
    bouton: "Relancer maintenant",
    faits: [
      REGIE_ARRET,
      "Les points et les places sont gardés.",
      "Tu peux aussi ouvrir la régie sur un autre appareil, avec le même lien.",
    ],
  },
  reseau: {
    etiquette: "Réseau perdu",
    titre: "Pas de connexion.",
    texte: () =>
      "La régie revient dès que le réseau revient. Vérifie le wifi de cet appareil.",
    essai: "En attente du réseau",
    bouton: "Réessayer",
    faits: [
      "La partie continue sur la TV tant qu'elle a internet.",
      "Les points et les places sont gardés.",
    ],
  },
};

const PHONE = {
  e1: {
    titre: "Bouge pas.",
    texte: (n) =>
      `On retourne le disque. Tu reviens dans la partie dans ${secondes(n)}.`,
  },
  e2: {
    titre: "Encore un tour.",
    texte: (n) => `Le disque se remet en place. Retour dans ${secondes(n)}.`,
  },
  e3: {
    titre: "Encore un tour.",
    texte: (n) => `Dernier réglage. Retour dans ${secondes(n)}.`,
  },
  pause: {
    titre: "Petite pause.",
    texte: () => "Ça repart tout seul : garde cette page ouverte.",
    bouton: "Réessayer maintenant",
  },
  reseau: {
    titre: "Plus de réseau.",
    texte: () => "On te ramène dans la partie dès que ça revient.",
    bouton: "Réessayer",
  },
};

export function texteTv(etat) {
  return TV[etat] ?? TV.e1;
}

export function texteRegie(etat, sec) {
  const t = REGIE[etat] ?? REGIE.e1;
  return {
    etiquette: t.etiquette,
    titre: t.titre,
    texte: t.texte(sec),
    essai: t.essai,
    bouton: t.bouton ?? "Relancer maintenant",
    faits: t.faits ?? [REGIE_ARRET, "Les points et les places sont gardés."],
  };
}

export function textePhone(etat, sec) {
  const t = PHONE[etat] ?? PHONE.e1;
  return {
    titre: t.titre,
    texte: t.texte(sec),
    bouton: t.bouton ?? "Revenir tout de suite",
  };
}

export const ADMIN = { appeler: "Appeler un admin", prevenu: "Admin prévenu" };
