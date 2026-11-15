import { describe, it, expect } from "vitest";
import {
  CAPTIONS,
  FAQ,
  FRISE,
  OFFRES,
  OFFRES_NOTE,
  soireeJsonLd,
} from "../soireeContent.js";
import { CARTONS, PINS } from "../soireeBeats.js";
import {
  FREE_MAX_PLAYERS,
  FREE_MAX_TEAMS,
  PLANS,
  PRIX_SOIREE,
  TESTED_LABEL,
} from "../../../data/proPlans.js";
import {
  SALON_DURATIONS,
  SALON_INTERMISSIONS,
  SALON_ROUNDS,
  SALON_TEAMS,
  SPECIALS,
  SPECIAL_INTRO_MS,
} from "../../../data/salonOptions.js";
import { calcSpeedBonus } from "../../../server/services/music/playlist.js";

const textes = (pin) => PINS[pin].beats.map((b) => b.t).join(" ");

describe("vitrine /soiree : textes", () => {
  it("la FAQ envoyée à Google est celle affichée", () => {
    const faq = JSON.parse(soireeJsonLd)["@graph"].find(
      (g) => g["@type"] === "FAQPage",
    );
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(
      FAQ.map((f) => [f.q, f.a]),
    );
  });

  it("offres : nom, prix, période, badge et bouton viennent de proPlans", () => {
    for (const o of OFFRES.filter((x) => x.id !== "free")) {
      const p = PLANS.find((x) => x.id === o.id);
      expect([o.name, o.price, o.period, o.badge, o.cta, o.top]).toEqual([
        p.name,
        p.price,
        p.period,
        p.badge,
        p.cta,
        !!p.featured,
      ]);
      expect(o.href).toBe("/pro#tarifs");
    }
    expect(OFFRES.map((o) => o.badge)).not.toContain("Le plus choisi");
    expect(OFFRES.filter((o) => o.top)).toHaveLength(1);
    const gratuit = OFFRES.find((o) => o.id === "free");
    expect(gratuit.perks).toContain(`Jusqu'à ${FREE_MAX_PLAYERS} joueurs`);
    expect(gratuit.perks).toContain(`${FREE_MAX_TEAMS} équipes`);
    expect(gratuit.href).toBe("/salon");
    expect(OFFRES_NOTE).toContain(TESTED_LABEL);
    expect(FAQ.at(-1).a).toContain(`${PRIX_SOIREE} avec la Soirée 24 h`);
    expect(OFFRES.find((o) => o.id === "yearly").period).toBe(
      PLANS.find((p) => p.id === "yearly").period,
    );
  });

  it("les chiffres suivent les réglages réels du salon", () => {
    const span = (a) => `${a[0]} à ${a.at(-1)}`;
    // 0 = pas d'entracte : on annonce la plage des vrais entractes
    const pauses = SALON_INTERMISSIONS.filter((m) => m > 0);
    expect(span(pauses)).toBe("5 à 30");
    expect(FRISE[2].p).toContain(`${span(SALON_ROUNDS)} manches`);
    expect(FRISE[5].b).toBe(`${span(pauses)} min`);
    expect(textes("manche")).toContain(span(SALON_DURATIONS));
    expect(textes("enchainer")).toContain(`${span(pauses)} minutes`);
    expect(textes("rejoindre")).toContain(`jusqu'à ${SALON_TEAMS.at(-1)}`);
    expect(PINS.speciales.lede).toContain(
      `${SPECIAL_INTRO_MS / 1000} secondes`,
    );
    expect(CARTONS.map((c) => c.label)).toEqual(
      Object.values(SPECIALS).map((s) => s.label),
    );
  });

  it("le bonus de rapidité annoncé est celui du serveur", () => {
    expect(textes("manche")).toContain("2 de bonus sous 10 s, ou 1 sous 20 s");
    expect([9.9, 10, 19.9, 20].map(calcSpeedBonus)).toEqual([2, 1, 1, 0]);
  });

  it("chaque fonction payante porte l'étiquette ZIK Pro", () => {
    const pro = (pin, mot) =>
      PINS[pin].beats.find((b) => (b.b ?? b.t).includes(mot)).pro;
    expect(pro("reponses", "Buzzer")).toBe(true);
    expect(pro("enchainer", "classement de soirée")).toBe(true);
    expect(pro("regie", "Volume")).toBe(true);
    // Pause et manche suivante sont gratuites ; révéler et terminer sont Pro (control.js)
    const regie = PINS.regie.beats.find((b) => b.t.includes("Pause"));
    expect(regie.t).toMatch(/Révéler ou terminer à tout moment avec$/);
    expect(regie.pro).toBe(true);
    const legende = CAPTIONS.find((c) => c.label === "La régie");
    expect(legende.text).toMatch(/Révéler et terminer à tout moment avec$/);
    expect(legende.pro).toBe(true);
    expect(CAPTIONS.filter((c) => c.pro)).toEqual([legende]);
    expect(PINS.podium.pro).toBe(true);
    expect(PINS.speciales.pro).toBe(true);
    expect(FRISE.find((f) => f.t === "Podium final").pro).toBe(true);
    // La story se partage en fin de partie (gratuit), pas au podium de soirée
    expect(textes("enchainer")).toContain("podium en story");
    expect(textes("podium")).not.toContain("story");
  });

  it("les légendes de la vidéo se suivent sans se chevaucher", () => {
    CAPTIONS.forEach((c, i) => {
      expect(c.from).toBeLessThan(c.to);
      if (i) expect(c.from).toBeGreaterThanOrEqual(CAPTIONS[i - 1].to);
    });
    expect(CAPTIONS[0].from).toBeGreaterThanOrEqual(0.1);
  });
});
