import { describe, it, expect } from "vitest";
import { STEPS } from "../steps.js";
import { universOf } from "../../layout/univers.js";

// Liens de menu présents dans la barre de chaque univers
const MENU = {
  jeu: ["/rooms", "/zikle", "/playlists", "/cartes", "/classements", "/docs"],
  soiree: ["/soiree", "/pro", "/salon"],
  aiguillage: [],
};

describe("tutoriel et navigation par univers", () => {
  it("chaque étape « cliquer le menu » se joue sur une page qui a ce lien", () => {
    let page = "/jouer";
    for (const s of STEPS) {
      if (s.path) page = s.path;
      if (s.mode === "nav") {
        expect(MENU[universOf(page)], `${s.title} sur ${page}`).toContain(s.to);
        page = s.to;
      }
    }
  });
});
