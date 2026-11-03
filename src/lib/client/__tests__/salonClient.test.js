import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveSalonKey,
  lastSalon,
  forgetSalon,
  openLastSalon,
} from "../salonClient.js";
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
