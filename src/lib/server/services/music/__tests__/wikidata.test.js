import { describe, it, expect, vi } from "vitest";
import { frenchTitle, pickFrench, WIKIDATA_UA } from "../wikidata.js";

const res = (label, description, language = "fr") => ({
  display: {
    label: { value: label, language },
    description: { value: description },
  },
});

describe("pickFrench", () => {
  it("premier résultat qui est un film ou une série, en français", () => {
    expect(
      pickFrench([
        res("Le Livre de la jungle", "jeu vidéo de 1993"),
        res("Le Livre de la jungle", "film d'animation des studios Disney"),
      ]),
    ).toBe("Le Livre de la jungle");
    expect(pickFrench([res("Friends", "série télévisée américaine")])).toBe(
      "Friends",
    );
    expect(pickFrench([res("Naruto", "série animée japonaise")])).toBe(
      "Naruto",
    );
    expect(pickFrench([res("One Piece", "animé japonais")])).toBe("One Piece");
  });

  it("ni album, ni chanson, ni libellé resté en anglais", () => {
    expect(
      pickFrench([
        res("The Aristocats – Soundtrack", "1994 soundtrack album"),
        res("The Aristocats", "future Disney live-action film", "en"),
        res("Frozen", "chanson de Madonna"),
        res("Hercule", "constellation"),
      ]),
    ).toBeNull();
    expect(pickFrench(undefined)).toBeNull();
  });
});

describe("frenchTitle", () => {
  const reply = (search, ok = true) =>
    vi.fn(async () => ({ ok, json: async () => ({ search }) }));

  it("interroge Wikidata en se présentant, et garde le résultat en mémoire", async () => {
    const f = reply([res("Les Aristochats", "film d'animation américain")]);
    expect(await frenchTitle("The Aristocats", f)).toBe("Les Aristochats");
    expect(await frenchTitle("the aristocats ", f)).toBe("Les Aristochats");
    expect(f).toHaveBeenCalledTimes(1);
    const [url, opts] = f.mock.calls[0];
    expect(url).toContain("search=The%20Aristocats");
    expect(opts.headers["User-Agent"]).toBe(WIKIDATA_UA);
  });

  it("Wikidata en panne ou en erreur : undefined, sans lever", async () => {
    const down = vi.fn(async () => {
      throw new Error("réseau");
    });
    expect(await frenchTitle("Titre panne", down)).toBeUndefined();
    expect(await frenchTitle("Titre 500", reply([], false))).toBeUndefined();
  });

  it("rien de sûr : null, gardé en mémoire", async () => {
    const f = reply([res("Hercule", "constellation")]);
    expect(await frenchTitle("Hercules", f)).toBeNull();
    expect(await frenchTitle("Hercules", f)).toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
  });
});
