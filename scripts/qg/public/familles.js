// Famille d'une action (phrase du QG) : décide de l'icône et de la couleur.
export const FAMILLES = {
  lit: "Lit",
  ecrit: "Écrit",
  tests: "Tests",
  build: "Vérifie",
  git: "Git et PR",
  web: "Web",
  base: "Base",
  prod: "Prod",
  question: "Question",
  pense: "Réfléchit",
};

const REGLES = [
  [/^Lance les tests/, "tests"],
  [/^(Vérifie|Construit|Installe)/, "build"],
  [
    /^(Enregistre un commit|Pousse la branche|Change de branche|Ouvre une PR|Fusionne une PR|Regarde l'historique git)/,
    "git",
  ],
  [/(page web|adresse web|sur le web|Utilise claude-in-chrome)/, "web"],
  [/^(Travaille sur la base|Utilise (Supabase|Stripe))/, "base"],
  [
    /^(Regarde Railway|Regarde GitHub|Surveille|Démarre un serveur|Utilise Railway)/,
    "prod",
  ],
  [/^Pose une question/, "question"],
  [/^(Écrit|Modifie)/, "ecrit"],
  [/^(Lit|Parcourt|Cherche|Prend une capture)/, "lit"],
];

export const famille = (quoi) =>
  REGLES.find(([re]) => re.test(quoi ?? ""))?.[1] ?? "pense";

export const icone = (f) =>
  `<svg class="i" aria-hidden="true"><use href="#i-${f}"/></svg>`;

export const couleur = (f) => `var(--f-${f})`;

// Segments de la chronologie : une action dure jusqu'à la suivante, au plus 3 min (au-delà, c'est une attente) ;
// la dernière va jusqu'à maintenant si l'instance travaille, 30 s sinon.
export function segments(traces, maintenant, actif) {
  return traces.map((tr, k) => {
    const suivante = traces[k + 1]?.t;
    const fin = suivante
      ? Math.min(suivante, tr.t + 180e3)
      : actif
        ? Math.min(maintenant, tr.t + 180e3)
        : Math.min(maintenant, tr.t + 30e3);
    return { f: famille(tr.quoi), t0: tr.t, t1: Math.max(fin, tr.t + 5e3) };
  });
}
