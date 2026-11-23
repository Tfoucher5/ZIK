import { ecran, mur, objet, porte, rect } from "../outils.js";

export default {
  id: "toit",
  bouton: "T",
  nom: "Toit",
  theme: "Héliport",
  z: 34.8,
  h: 3.2,
  x0: 28.8,
  prive: true,
  facade: false,
  matieres: "Acier, caillebotis",
  surface: "plateforme Ø 13 m",
  murs: [
    mur("acrotere", 28.8, 0, 43.2, 0),
    mur("acrotere", 43.2, 0, 43.2, 25.2),
    mur("acrotere", 28.8, 25.2, 43.2, 25.2),
    mur("vitrage", 28.8, 0, 28.8, 25.2),
  ],
  portes: [
    porte(34.1, 19.2, 1.2, "h", 0, ["machine-head", "savile-row"], {
      type: "ouvert",
    }),
  ],
  pieces: [
    {
      id: "machine-head",
      nom: "Machine Head",
      usage: "CTA, groupes froids, panneaux solaires, sas de l'ascenseur privé",
      sous: ["CTA, groupes froids, panneaux solaires"],
      poly: [
        [28.8, 0],
        [43.2, 0],
        [43.2, 25.2],
        [28.8, 25.2],
        [28.8, 18],
        [36, 18],
        [36, 7.2],
        [28.8, 7.2],
      ],
      acces: "service",
      etiquette: [36.6, 4.3],
      qui: "maintenance",
      pourquoi:
        "Sous la plateforme et derrière les écrans de l'enseigne ; accès par E1.",
      mobilier: [
        objet("equipement", 30, 1.2, 3.4, 2.4),
        objet("equipement", 34.4, 1.2, 3.4, 2.4),
        objet("equipement", 38.8, 1.2, 3.4, 2.4),
        objet("equipement", 30, 21.6, 5, 2.4),
        objet("equipement", 36, 21.6, 3, 2.4),
        objet("equipement", 39.8, 21.6, 2.4, 2.4),
        ecran(30, 0, 42, 0),
        ecran(30, 25.2, 42, 25.2),
      ],
    },
  ],
  terrasses: [
    {
      id: "savile-row",
      nom: "Savile Row",
      usage: "Héliport, plateforme de 13 m à +38,00",
      sous: ["héliport · plateforme 13 m, +38,00"],
      poly: rect(29.2, 5.2, 43.2, 19.2),
      altitude: 38,
      acces: "fondateur",
      etiquette: [36.6, 16.4],
      qui: "Théo",
      pourquoi:
        "Posé sur les locaux techniques, dégagé de tout obstacle. Une volée de marches part du sas de l'ascenseur privé.",
      mobilier: [
        objet("plateforme", 29.2, 5.2, 14, 14),
        { type: "helisurface", x: 36.6, y: 12.6, r: 6.5 },
      ],
    },
  ],
  abords: [],
  textes: [
    {
      x: 36.6,
      y: -0.8,
      t: "enseigne ZIK · lettres de 3 m, faces nord et sud",
      style: "us",
    },
    {
      x: 32.6,
      y: 20.9,
      t: "sous la plateforme : sas de l'ascenseur privé, E1",
      style: "us-or",
    },
    { x: 14.4, y: 12.6, t: "Terrasses et verrière en contrebas", style: "ext" },
  ],
};
