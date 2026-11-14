import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveSalonKey,
  lastSalon,
  forgetSalon,
  openLastSalon,
  saveSetup,
  readSetup,
  setupFor,
} from "../salonClient.js";
import { FREE_MAX_TEAMS } from "../../data/proPlans.js";
import { listenHost } from "../../components/salon/host/hostEvents.js";

let store;
beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("hôte qui revient dans sa soirée", () => {
  it("la dernière soirée créée est proposée pendant 12 h", () => {
    saveSalonKey("ABC123", "cle");
    const at = JSON.parse(store.zik_salon_last).at;
    expect(lastSalon(at + 60_000)).toBe("ABC123");
    expect(lastSalon(at + 12 * 60 * 60 * 1000)).toBeNull();
  });

  it("sans la clé de régie, rien n'est proposé", () => {
    saveSalonKey("ABC123", "cle");
    delete store.zik_salon_key_ABC123;
    expect(lastSalon()).toBeNull();
  });

  it("oublier une soirée ne touche pas à une plus récente", () => {
    saveSalonKey("ABC123", "cle");
    saveSalonKey("XYZ789", "cle2");
    forgetSalon("ABC123");
    expect(lastSalon()).toBe("XYZ789");
    forgetSalon("XYZ789");
    expect(lastSalon()).toBeNull();
  });

  it("salon fermé pour de bon : la TV qui ne le retrouve pas le fait oublier", () => {
    saveSalonKey("ABC123", "cle");
    const ecoute = {};
    const h = { code: "ABC123", joined: false };
    listenHost(h, { on: (ev, fn) => (ecoute[ev] = fn) });
    ecoute.salon_error({ message: "Salon introuvable." });
    expect(lastSalon()).toBeNull();
  });
});

describe("carte « votre soirée est encore ouverte »", () => {
  const repond = (status) => async () => ({ ok: status === 200, status });

  it("s'affiche seulement si le serveur dit la soirée ouverte", async () => {
    saveSalonKey("ABC123", "cle");
    expect(await openLastSalon(repond(200))).toBe("ABC123");
  });

  it("soirée fermée : rien ne s'affiche et elle est oubliée", async () => {
    saveSalonKey("ABC123", "cle");
    expect(await openLastSalon(repond(404))).toBeNull();
    expect(lastSalon()).toBeNull();
  });

  it("réseau en panne : rien ne s'affiche, mais rien n'est oublié", async () => {
    saveSalonKey("ABC123", "cle");
    const panne = async () => {
      throw new Error("offline");
    };
    expect(await openLastSalon(panne)).toBeNull();
    expect(lastSalon()).toBe("ABC123");
  });
});

describe("dernière préparation de soirée", () => {
  const defaults = { maxRounds: 10, specials: false, teamCount: 0 };

  it("reprend playlists et réglages encore valables", () => {
    saveSetup(["a", "gone"], { maxRounds: 15, specials: true, teamCount: 2 });
    expect(readSetup(defaults, ["a", "b"])).toEqual({
      playlistIds: ["a"],
      settings: { maxRounds: 15, specials: true, teamCount: 2 },
    });
  });

  it("ignore une sauvegarde absente, corrompue ou de mauvais type", () => {
    expect(readSetup(defaults, ["a"])).toBeNull();
    store.zik_salon_setup = "{pas du json";
    expect(readSetup(defaults, ["a"])).toBeNull();
    store.zik_salon_setup = JSON.stringify({
      playlistIds: "a",
      settings: { maxRounds: "999", inconnu: 1 },
    });
    expect(readSetup(defaults, ["a"])).toEqual({
      playlistIds: [],
      settings: {},
    });
  });
});

describe("réglages repris selon l'offre de l'hôte", () => {
  const defaults = {
    maxRounds: 10,
    roundDuration: 30,
    answerMode: "multiple",
    manualNext: false,
    showAnswerDuration: 7,
    teamCount: 0,
    specials: false,
  };
  const saved = {
    answerMode: "buzzer",
    specials: true,
    teamCount: 6,
    maxRounds: 15,
  };

  it("sans Pro : ni buzzer, ni manches spéciales, équipes plafonnées", () => {
    expect(setupFor(saved, false, defaults)).toMatchObject({
      answerMode: "multiple",
      specials: false,
      teamCount: FREE_MAX_TEAMS,
      maxRounds: 15,
    });
  });

  it("avec Pro : tout est repris", () => {
    expect(setupFor(saved, true, defaults)).toMatchObject(saved);
  });

  it("une valeur hors des choix proposés retombe sur le défaut", () => {
    const s = setupFor({ maxRounds: 999, roundDuration: 7 }, true, defaults);
    expect(s).toMatchObject({ maxRounds: 10, roundDuration: 30 });
  });
});
