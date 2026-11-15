import { describe, it, expect } from "vitest";
import { render as ssr } from "svelte/server";
import { seg, stage, typed, pinRegistry } from "../soireePins.js";
import { PINS } from "../soireeBeats.js";
import Rejoindre, { render as rejoindre } from "../Rejoindre.svelte";
import Manche, { render as manche } from "../Manche.svelte";
import Revelation, { render as revelation } from "../Revelation.svelte";
import Reponses, { render as reponses } from "../Reponses.svelte";
import Speciales, { render as speciales } from "../Speciales.svelte";
import Regie, { render as regie } from "../Regie.svelte";
import Enchainer, { render as enchainer } from "../Enchainer.svelte";
import Podium, { render as podium } from "../Podium.svelte";
import Tient, { render as tient } from "../Tient.svelte";
import { render as frise } from "../Frise.svelte";

const SCENES = {
  rejoindre: [Rejoindre, rejoindre],
  manche: [Manche, manche],
  revelation: [Revelation, revelation],
  reponses: [Reponses, reponses],
  speciales: [Speciales, speciales],
  regie: [Regie, regie],
  enchainer: [Enchainer, enchainer],
  podium: [Podium, podium],
  tient: [Tient, tient],
};
const GRILLE = Array.from({ length: 101 }, (_, i) => i / 100);

describe("outils des sections épinglées", () => {
  it("seg, stage et typed bornent la progression", () => {
    expect([seg(-1, 0, 1), seg(0.5, 0, 1), seg(2, 0, 1)]).toEqual([0, 0.5, 1]);
    expect([0, 0.3, 0.62, 1].map((p) => stage(p, [0.3, 0.62]))).toEqual([
      0, 1, 2, 2,
    ]);
    expect(typed(0, "léa", 0.1, 0.2)).toBe("");
    expect(typed(1, "léa", 0.1, 0.2)).toBe("léa");
  });

  it("le registre rend la main pour se désinscrire", () => {
    const reg = pinRegistry();
    const off = reg.add({ id: 1 });
    reg.add({ id: 2 });
    off();
    expect(reg.list).toEqual([{ id: 2 }]);
    expect(reg.live).toBe(false);
  });
});

describe("render(p) des sections", () => {
  for (const [id, [, render]] of Object.entries(SCENES)) {
    it(`${id} : même p, même état, sérialisable, phrase existante`, () => {
      for (const p of GRILLE) {
        const s = render(p);
        expect(render(p)).toEqual(s);
        expect(JSON.parse(JSON.stringify(s))).toEqual(s);
        const n = PINS[id].beats?.length;
        const b = s.beat ?? s.m ?? s.st;
        if (n) expect(b).toBeGreaterThanOrEqual(0);
        if (n) expect(b).toBeLessThan(n);
      }
    });
  }

  it("rejoindre : les joueurs arrivent un à un jusqu'à 8", () => {
    const k = GRILLE.map((p) => rejoindre(p).k);
    expect(k[0]).toBe(0);
    expect(k.at(-1)).toBe(8);
    expect(k.every((x, i) => !i || x >= k[i - 1])).toBe(true);
    expect(rejoindre(0).rouges).toBe("Personne encore");
  });

  it("manche : le chrono descend de 30 à 9, magenta sous 10 s", () => {
    expect(manche(0).t).toBe(30);
    expect(manche(1)).toMatchObject({ t: 9, warn: true, all: true, ans: 8 });
    expect(manche(0).txt).toBe("");
  });

  it("révélation : à la fin, le classement suit les nouveaux scores", () => {
    const fin = revelation(1).rows;
    const ordre = [...fin].sort((a, b) => a.y - b.y);
    const scores = ordre.map((r) => r.s);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(ordre[0]).toMatchObject({ n: "Léa", s: 22, rk: "01" });
    expect(revelation(0).rows.every((r) => r.go === 0)).toBe(true);
  });

  it("réponses : seule la bonne case reste valide en 4 choix", () => {
    expect(reponses(0.6).choix).toEqual(["good", "no", "no", "no"]);
    expect(reponses(1)).toMatchObject({ m: 2, juste: true, regie: true });
  });

  it("manches spéciales : un carton à la fois, le dernier reste", () => {
    expect(speciales(0).every((c) => c.o === 0)).toBe(true);
    expect(speciales(1).map((c) => c.o)).toEqual([0, 0, 1]);
    expect(speciales(0.2).filter((c) => c.o > 0)).toHaveLength(1);
  });

  it("régie : pause, réponse dévoilée sur la régie, volume, point corrigé", () => {
    expect(regie(0.3).paused).toBe(true);
    expect(regie(0.5).paused).toBe(false);
    expect(regie(0.4).shown).toBe(false);
    expect(regie(1)).toMatchObject({ shown: true, vol: 75 });
    expect(regie(1).players[4].s).toBe(15);
    expect(regie(1).players[3].mot).toBe("déconnecté");
  });

  it("enchaîner : le cumul des 3 parties", () => {
    expect(enchainer(1).parties).toBe("3 parties");
    expect(enchainer(1).cumul[0]).toMatchObject({ nom: "Léa", pts: 93, k: 1 });
    expect(enchainer(0).now).toBe(0);
  });

  it("podium : 3e, 2e, tambour puis le vainqueur", () => {
    expect(
      podium(0.2)
        .places.filter((x) => x.on)
        .map((x) => x.n),
    ).toEqual(["Zoé"]);
    expect(podium(0.6)).toMatchObject({ tambour: true, gagnant: false });
    expect(podium(1)).toMatchObject({
      titre: "Léa",
      gagnant: true,
      reste: true,
    });
    expect(podium(1).places.find((x) => x.n === "Léa").s).toBe(93);
  });

  it("ça tient : coupure, demande à l'hôte, panne de musique", () => {
    expect(tient(0.1).wifi).toBe(true);
    expect(tient(0.5)).toMatchObject({ regie: true, lay: 2 });
    expect(tient(0.8).panne).toBe(true);
    expect(tient(0.95).panne).toBe(false);
  });

  it("frise : les étapes s'allument quand la ligne les atteint", () => {
    const stops = [0, 0.5, 1];
    expect(frise(0.49, stops).on).toEqual([true, false, false]);
    expect(frise(1, stops).on).toEqual([true, true, true]);
  });
});

describe("rendu serveur (sans JS, état final lisible)", () => {
  for (const [id, [Comp]] of Object.entries(SCENES)) {
    it(`${id} : titre, phrases et objet décoratif`, () => {
      const { body } = ssr(Comp);
      expect(body).toContain(`id="${id}-t"`);
      expect(body).toContain(PINS[id].title.replace("'", "&#39;"));
      for (const b of PINS[id].beats ?? [])
        expect(body).toContain(b.t.slice(0, 20));
      expect(body).toMatch(/aria-hidden="true"|class="dev cartons/);
    });
  }
});
