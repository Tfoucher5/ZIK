import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import {
  PORTE,
  ETAGES,
  media,
  glassSpot,
  flashAt,
  ambiance,
  createDing,
} from "../scenes.js";

describe("films de l'accueil", () => {
  it("les médias versionnés existent dans static/", () => {
    for (const { film } of [PORTE, ETAGES])
      for (const forme of ["portrait", "paysage"])
        for (const ext of ["mp4", "webp"])
          expect(existsSync(`static${media(film, forme, ext)}`)).toBe(true);
  });

  it("une légende à la fois, dans l'ordre du film", () => {
    for (const { caps } of [PORTE, ETAGES])
      caps.forEach((c, i) => {
        expect(c.from).toBeLessThan(c.to);
        if (i) expect(c.from).toBeGreaterThanOrEqual(caps[i - 1].to);
      });
  });

  it("le flash culmine à son instant et s'éteint ailleurs", () => {
    expect(flashAt(PORTE.flash, PORTE)).toBeCloseTo(PORTE.flashMax);
    expect(flashAt(0.5, PORTE)).toBe(0);
  });

  it("la lueur suit le verre de la porte, affiche recadrée en cover", () => {
    // 390×900 en portrait : l'affiche 720×1560 remplit la hauteur, centrée
    const m = glassSpot(390, 900, true);
    expect(m.x).toBeCloseTo(195);
    expect(m.y).toBeCloseTo(0.545 * 900);
    // 1600×800 en paysage : l'affiche 16:9 remplit la largeur, débord vertical centré
    const d = glassSpot(1600, 800, false);
    expect(d.x).toBeCloseTo(0.727 * 1600);
    expect(d.y).toBeCloseTo((800 - 900) / 2 + 0.522 * 900);
  });

  it("le son ne suit que la scène sous le milieu de l'écran", () => {
    const H = 800;
    expect(ambiance(0.5, { top: 500, bottom: 5000 }, H, PORTE)).toBeNull();
    expect(ambiance(0.5, { top: -4000, bottom: 300 }, H, PORTE)).toBeNull();
    const a = ambiance(0.5, { top: -100, bottom: 4000 }, H, PORTE);
    expect(a).toEqual({ open: 1, vol: 1 });
    // Dernière scène : garde la main en sortant, volume qui retombe à 0
    expect(ambiance(1, { top: -4000, bottom: 100 }, H, ETAGES, true)).toEqual({
      open: 0.5,
      vol: 0,
    });
  });

  it("le ding sonne une fois au passage, et se réarme si on remonte", () => {
    const ding = createDing();
    expect(ding(0.69, 0.7, true)).toBe(false);
    expect(ding(0.71, 0.7, false)).toBe(false);
    expect(ding(0.71, 0.7, true)).toBe(true);
    expect(ding(0.75, 0.7, true)).toBe(false);
    expect(ding(0.68, 0.7, true)).toBe(false);
    expect(ding(0.71, 0.7, true)).toBe(false);
    expect(ding(0.6, 0.7, true)).toBe(false);
    expect(ding(0.71, 0.7, true)).toBe(true);
  });
});
