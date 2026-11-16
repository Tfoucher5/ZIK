import { objet, porte, rect, zone } from "../outils.js";

export default {
  id: "ss",
  bouton: "-1",
  nom: "Sous-sol",
  theme: "Technique · archives, cuve du mur d'eau",
  z: -3.4,
  h: 3.4,
  x0: 0,
  facade: "porteur",
  matieres: "Béton brut, résine",
  surface: "1 090 m²",
  murs: [],
  portes: [
    porte(28.8, 2, 3, "v", 0, ["velvet-underground", "tubular-bells"], {
      type: "ouvert",
    }),
    porte(28.8, 20, 3, "v", 0, ["velvet-underground", "tubular-bells"], {
      type: "ouvert",
    }),
  ],
  pieces: [
    {
      id: "velvet-underground",
      nom: "Velvet Underground",
      usage: "Archives et cuve du mur d'eau",
      sous: ["archives · cuve du mur d'eau"],
      poly: rect(0, 0, 28.8, 25.2),
      acces: "service",
      etiquette: [16, 12.6],
      qui: "maintenance",
      pourquoi:
        "Sous toute l'emprise : la cuve est à l'aplomb du mur d'eau, les archives au sec côté ouest.",
      mobilier: [
        zone("cuve", 7.4, 7.6, 1.6, 10),
        objet("rayonnage", 1, 1, 0.6, 5),
        objet("rayonnage", 2.6, 1, 0.6, 5),
        objet("rayonnage", 4.2, 1, 0.6, 5),
        objet("rayonnage", 1, 19, 0.6, 5),
        objet("rayonnage", 2.6, 19, 0.6, 5),
      ],
    },
    {
      id: "tubular-bells",
      nom: "Tubular Bells",
      usage: "Pompes du mur d'eau, chaufferie, locaux techniques",
      sous: ["pompes, chaufferie"],
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
      etiquette: [39.6, 21.6],
      qui: "maintenance",
      pourquoi:
        "Contre le monte-charge : une pompe se change sans traverser un étage.",
      mobilier: [
        objet("equipement", 37.4, 1.2, 4.4, 2.4),
        objet("equipement", 37.4, 12, 4.4, 3),
        objet("equipement", 30, 20.4, 4, 2.4),
      ],
    },
  ],
  terrasses: [],
  abords: [],
  textes: [],
};
