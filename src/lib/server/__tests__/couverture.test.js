import { describe, it, expect } from "vitest";
import {
  markdown,
  badge,
  couleur,
  etat,
  zone,
  parZone,
  barre,
} from "../../../../scripts/couverture.mjs";

const SEUILS = { statements: 43, branches: 35, functions: 40, lines: 45 };
const m = (pct, covered = 0, total = 0) => ({ pct, covered, total });
const resume = (s, b, f, l, fichiers = {}) => ({
  total: { statements: m(s), branches: m(b), functions: m(f), lines: m(l) },
  ...fichiers,
});
const fichier = (covered, total) => ({ lines: m(0, covered, total) });

describe("couverture des tests", () => {
  it("état face au seuil : sous, juste au-dessus, confortable", () => {
    expect([etat(40, 45), etat(47, 45), etat(60, 45)]).toEqual([
      "❌",
      "⚠️",
      "✅",
    ]);
  });

  it("barre sur 10 crans, bornée", () => {
    expect(barre(64.7)).toBe("▰▰▰▰▰▰▱▱▱▱");
    expect(barre(120)).toBe("▰".repeat(10));
  });

  it("zones : dossier du serveur, quel que soit le système", () => {
    expect(zone("/home/r/src/lib/server/socket/salon/join.js")).toBe(
      "socket/salon",
    );
    expect(zone(String.raw`C:\z\src\lib\server\services\music\deezer.js`)).toBe(
      "services/music",
    );
    expect(zone("/x/src/lib/server/socket/index.js")).toBe("socket");
    expect(zone("/x/autre/fichier.js")).toBeNull();
  });

  it("zones classées de la moins à la mieux testée", () => {
    const r = resume(1, 1, 1, 1, {
      "/a/src/lib/server/socket/salon/a.js": fichier(90, 100),
      "/a/src/lib/server/socket/salon/b.js": fichier(10, 100),
      "/a/src/lib/server/services/music/c.js": fichier(20, 100),
      "/a/src/lib/server/services/vide/d.js": fichier(0, 0),
    });
    expect(
      parZone(r).map((z) => [z.nom, Math.round(z.pct), z.fichiers]),
    ).toEqual([
      ["services/music", 20, 1],
      ["socket/salon", 50, 2],
    ]);
  });

  it("rapport : titre, écart avec develop et baisse signalée", () => {
    const md = markdown(
      resume(62.06, 52.6, 54.5, 64.7),
      resume(60, 52.6, 55, 64.72),
      SEUILS,
    );
    expect(md).toContain("## ✅ Couverture au-dessus du seuil");
    expect(md).toContain("📈 +2,1");
    expect(md).toContain("📉 -0,5");
    expect(md).toContain("En baisse par rapport à develop");
  });

  it("sous le seuil : la CI refuse, sans écart inventé sans référence", () => {
    const md = markdown(resume(50, 30, 50, 50), null, SEUILS);
    expect(md).toContain("## ❌ Couverture sous le seuil");
    expect(md).toContain("Pas encore de mesure de référence");
    expect(md).not.toMatch(/📈|📉/);
  });

  it("badge : lignes couvertes arrondies, couleur selon le niveau", () => {
    expect(badge(resume(0, 0, 0, 64.7).total)).toContain(">65 %<");
    expect([couleur(85), couleur(65), couleur(50), couleur(30)]).toEqual([
      "#3fb950",
      "#a3c93a",
      "#d29922",
      "#e5534b",
    ]);
  });
});
