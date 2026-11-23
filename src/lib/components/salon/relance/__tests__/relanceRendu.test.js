import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import RelanceTv from "../RelanceTv.svelte";
import RelanceRegie from "../RelanceRegie.svelte";
import RelancePhone from "../RelancePhone.svelte";
import Disque from "../Disque.svelte";
import { etatDe, textePhone, texteRegie } from "../textes.js";

const ETATS = {
  e1: { mode: "auto", essai: 1, sec: 3 },
  e2: { mode: "auto", essai: 2, sec: 10 },
  e3: { mode: "auto", essai: 3, sec: 30 },
  pause: { mode: "pause", essai: 4, sec: null },
  reseau: { mode: "reseau", essai: 2, sec: null },
};

const relance = (etat, o = {}) => ({
  ecran: "host",
  ...ETATS[etat],
  joue: false,
  ref: "K7M2QX · 21:42",
  code: "K7M2QX",
  adminPrevenu: false,
  maintenant() {},
  appelerAdmin() {},
  ...o,
});

const rendu = (C, etat, o) =>
  render(C, { props: { relance: relance(etat, o) } }).body;
const texte = (html) =>
  html
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");

const nb = (html, re) => (html.match(re) ?? []).length;

describe("relance : états", () => {
  it("mode et essai donnent l'état affiché", () => {
    expect(etatDe("auto", 1)).toBe("e1");
    expect(etatDe("auto", undefined)).toBe("e1");
    expect(etatDe("auto", 2)).toBe("e2");
    expect(etatDe("auto", 3)).toBe("e3");
    expect(etatDe("auto", 7)).toBe("e3");
    expect(etatDe("pause", 1)).toBe("pause");
    expect(etatDe("reseau", 1)).toBe("reseau");
  });

  it("une seconde au singulier, jamais zéro", () => {
    expect(texteRegie("e1", 1).texte).toBe(
      "Retour dans 1 seconde, sans rien faire.",
    );
    expect(textePhone("e2", 0).texte).toBe(
      "Le disque se remet en place. Retour dans 1 seconde.",
    );
  });
});

describe("relance : TV", () => {
  const TV = {
    e1: "ON RETOURNE LE DISQUE.|La soirée reprend toute seule. Personne ne perd sa place ni ses points.",
    e2: "ENCORE UN TOUR.|Le disque se remet en place. Personne ne perd sa place ni ses points.",
    e3: "ENCORE UN TOUR.|Le disque se remet en place. Personne ne perd sa place ni ses points.",
    pause:
      "PETITE PAUSE.|La soirée reprend dans un instant. Personne ne perd sa place ni ses points.|Si l'écran reste ici, rechargez la page de la TV.",
    reseau:
      "PETITE PAUSE.|La TV attend le retour d'internet. La soirée reprend toute seule, personne ne perd ses points.|Vérifiez la connexion de la TV.",
  };

  for (const [etat, attendu] of Object.entries(TV)) {
    it(`${etat} : textes exacts, aucun bouton, code affiché`, () => {
      const html = rendu(RelanceTv, etat);
      const [titre, ...lignes] = attendu.split("|");
      expect(texte(html).toUpperCase()).toContain(titre);
      for (const l of lignes) expect(texte(html)).toContain(l);
      expect(html).not.toContain("<button");
      expect(texte(html)).toContain("CODE");
      expect(nb(html, /<b\b[^>]*>[A-Z0-9]<\/b>/g)).toBe(6);
      expect(nb(html, /role="status"/g)).toBe(1);
    });
  }

  it("pas de seconde ligne tant que ça repart seul", () => {
    expect(rendu(RelanceTv, "e1")).not.toContain("rechargez");
  });

  it("aucun mot technique devant le public", () => {
    for (const etat of Object.keys(TV)) {
      expect(texte(rendu(RelanceTv, etat))).not.toMatch(
        /erreur|500|serveur|bug/i,
      );
    }
  });
});

describe("relance : régie", () => {
  const REGIE = {
    e1: [
      "Relance",
      "La régie redémarre.",
      "Retour dans 3 secondes, sans rien faire.",
      "Essai 1 sur 3",
      "Relancer maintenant",
    ],
    e2: [
      "Relance",
      "Nouvel essai.",
      "La régie n'est pas repartie du premier coup. Retour dans 10 secondes.",
      "Essai 2 sur 3",
      "Relancer maintenant",
    ],
    e3: [
      "Relance",
      "Troisième essai.",
      "Retour dans 30 secondes. Ensuite, un essai par minute.",
      "Essai 3 sur 3",
      "Relancer maintenant",
    ],
    pause: [
      "Relance lente",
      "La régie ne repart pas seule.",
      "Un essai par minute, sans rien faire. Tu peux aussi relancer toi-même.",
      "Un essai par minute",
      "Relancer maintenant",
      "Appeler un admin",
      "Tu peux aussi ouvrir la régie sur un autre appareil, avec le même lien.",
    ],
    reseau: [
      "Réseau perdu",
      "Pas de connexion.",
      "La régie revient dès que le réseau revient. Vérifie le wifi de cet appareil.",
      "En attente du réseau",
      "Réessayer",
      "La partie continue sur la TV tant qu'elle a internet.",
    ],
  };

  for (const [etat, lignes] of Object.entries(REGIE)) {
    it(`${etat} : textes exacts, réf. et points gardés`, () => {
      const html = rendu(RelanceRegie, etat);
      for (const l of lignes) expect(texte(html)).toContain(l);
      expect(texte(html)).toContain("Les points et les places sont gardés.");
      expect(texte(html)).toContain("Réf. K7M2QX · 21:42");
      expect(nb(html, /role="status"/g)).toBe(1);
    });
  }

  it("la partie n'est pas arrêtée, sauf en réseau où elle continue sur la TV", () => {
    const arret =
      "La partie n'est pas arrêtée. La TV et les joueurs ne voient pas cet écran.";
    for (const e of ["e1", "e2", "e3", "pause"])
      expect(texte(rendu(RelanceRegie, e))).toContain(arret);
    expect(texte(rendu(RelanceRegie, "reseau"))).not.toContain(arret);
  });

  it("bouton discret tant que ça repart seul, magenta en pause et réseau", () => {
    expect(rendu(RelanceRegie, "e1")).not.toContain("sx-btn-primary");
    expect(nb(rendu(RelanceRegie, "pause"), /sx-btn-primary/g)).toBe(1);
    expect(nb(rendu(RelanceRegie, "reseau"), /sx-btn-primary/g)).toBe(1);
  });

  it("Appeler un admin seulement en pause longue, puis Admin prévenu", () => {
    expect(rendu(RelanceRegie, "e3")).not.toContain("Appeler un admin");
    expect(rendu(RelanceRegie, "reseau")).not.toContain("Appeler un admin");
    const prevenu = rendu(RelanceRegie, "pause", { adminPrevenu: true });
    expect(prevenu).toContain("Admin prévenu");
    expect(prevenu).not.toContain("Appeler un admin");
    expect(prevenu).toMatch(/<button[^>]*disabled/);
  });
});

describe("relance : téléphone", () => {
  const PHONE = {
    e1: [
      "Bouge pas.",
      "On retourne le disque. Tu reviens dans la partie dans 3 secondes.",
      "Revenir tout de suite",
    ],
    e2: [
      "Encore un tour.",
      "Le disque se remet en place. Retour dans 10 secondes.",
      "Revenir tout de suite",
    ],
    e3: [
      "Encore un tour.",
      "Dernier réglage. Retour dans 30 secondes.",
      "Revenir tout de suite",
    ],
    pause: [
      "Petite pause.",
      "Ça repart tout seul : garde cette page ouverte.",
      "Réessayer maintenant",
    ],
    reseau: [
      "Plus de réseau.",
      "On te ramène dans la partie dès que ça revient.",
      "Réessayer",
    ],
  };

  for (const [etat, lignes] of Object.entries(PHONE)) {
    it(`${etat} : textes exacts, un seul bouton`, () => {
      const html = rendu(RelancePhone, etat, { ecran: "play" });
      for (const l of lignes) expect(texte(html)).toContain(l);
      expect(nb(html, /<button/g)).toBe(1);
      expect(nb(html, /role="status"/g)).toBe(1);
      expect(nb(html, /sx-btn-primary/g)).toBe(
        etat === "pause" || etat === "reseau" ? 1 : 0,
      );
    });
  }

  it("« Ta place et tes points sont gardés » seulement si le téléphone jouait", () => {
    const phrase = "Ta place et tes points sont gardés.";
    expect(rendu(RelancePhone, "e1")).not.toContain(phrase);
    expect(rendu(RelancePhone, "e1", { joue: true })).toContain(phrase);
    expect(rendu(RelancePhone, "pause", { joue: true })).toContain(phrase);
  });
});

describe("relance : disque", () => {
  it("chiffre sur l'étiquette, décoratif", () => {
    const html = render(Disque, {
      props: { sec: 3, d: "100px", g: "2px" },
    }).body;
    expect(html).toMatch(/aria-hidden="true"/);
    expect(html).toMatch(/class="num[^"]*"[^>]*>3</);
    expect(html).not.toContain("bars");
  });

  it("deux chiffres plus petits, signe pause sans chiffre en pause", () => {
    const deux = render(Disque, {
      props: { sec: 30, d: "1px", g: "1px" },
    }).body;
    expect(deux).toMatch(/class="num[^"]*\btwo"/);
    const pause = render(Disque, {
      props: { sec: null, pause: true, d: "1px", g: "1px" },
    }).body;
    expect(pause).toContain("bars");
    expect(pause).not.toContain('class="num');
  });

  it("rendu serveur sans window", () => {
    expect(globalThis.window).toBeUndefined();
    for (const C of [RelanceTv, RelanceRegie, RelancePhone])
      for (const e of Object.keys(ETATS))
        expect(() => rendu(C, e)).not.toThrow();
  });

  it("sans code ni réf. : rien de cassé", () => {
    const o = { code: null, ref: null };
    expect(rendu(RelanceTv, "e1", o)).not.toContain("CODE");
    expect(texte(rendu(RelanceRegie, "e1", o))).not.toContain("Réf.");
    expect(() => rendu(RelancePhone, "e1", o)).not.toThrow();
  });
});
