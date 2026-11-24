import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const db = vi.hoisted(() => ({
  row: null,
  error: null,
  throws: false,
  upsertError: null,
  upserts: [],
}));

vi.mock("../../../config.js", () => ({
  getAdminClient: () => {
    if (db.throws) throw new Error("base injoignable");
    const q = {
      from: () => q,
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data: db.row, error: db.error }),
      upsert: async (v) => {
        db.upserts.push(v);
        return { error: db.upsertError };
      },
    };
    return { schema: () => q };
  },
}));

const frais = async () => {
  delete globalThis.__zik_mediaSources;
  vi.resetModules();
  return import("../sources.js");
};
const TOUT = { youtube: true, deezer: true };

describe("interrupteurs des sources", () => {
  beforeEach(() =>
    Object.assign(db, {
      row: null,
      error: null,
      throws: false,
      upsertError: null,
      upserts: [],
    }),
  );
  afterEach(() => vi.useRealTimers());

  it("rien en base : tout allumé", async () => {
    const { getSources } = await frais();
    expect(await getSources()).toEqual(TOUT);
  });

  it("lit la valeur en base", async () => {
    db.row = { value: { youtube: false } };
    const { getSources, sources } = await frais();
    expect(await getSources()).toEqual({ youtube: false, deezer: true });
    expect(sources()).toEqual({ youtube: false, deezer: true });
  });

  it("valeur mal formée en base : la source reste allumée", async () => {
    db.row = { value: { youtube: null, deezer: "x" } };
    const { getSources } = await frais();
    expect(await getSources()).toEqual(TOUT);
  });

  it("base injoignable : tout reste allumé, rien ne plante", async () => {
    db.throws = true;
    const { getSources } = await frais();
    expect(await getSources()).toEqual(TOUT);
  });

  it("erreur de base après une coupure : la coupure reste", async () => {
    vi.useFakeTimers();
    db.row = { value: { deezer: false } };
    const { getSources } = await frais();
    await getSources();
    db.error = { message: "timeout" };
    vi.advanceTimersByTime(61_000);
    expect(await getSources()).toEqual({ youtube: true, deezer: false });
  });

  it("changement en base relu après une minute, sans attente dans une manche", async () => {
    vi.useFakeTimers();
    const { getSources, sources } = await frais();
    await getSources();
    db.row = { value: { youtube: false } };
    vi.advanceTimersByTime(30_000);
    expect(sources()).toEqual(TOUT);
    vi.advanceTimersByTime(31_000);
    expect(sources()).toEqual(TOUT);
    await getSources();
    expect(sources()).toEqual({ youtube: false, deezer: true });
  });

  it("enregistrer : écrit en base et s'applique tout de suite", async () => {
    const { setSources, sources } = await frais();
    await setSources({ youtube: false, deezer: true });
    expect(db.upserts[0]).toMatchObject({
      key: "media_sources",
      value: { youtube: false, deezer: true },
    });
    expect(sources()).toEqual({ youtube: false, deezer: true });
  });

  it("enregistrer en erreur : lève, rien ne change", async () => {
    db.upsertError = { message: "refusé" };
    const { setSources, getSources } = await frais();
    await getSources();
    await expect(setSources({ youtube: false })).rejects.toThrow("refusé");
    expect(await getSources()).toEqual(TOUT);
  });

  it("deux copies du module (admin et sockets) partagent la coupure", async () => {
    const admin = await frais();
    await admin.getSources();
    vi.resetModules();
    const sockets = await import("../sources.js");
    await admin.setSources({ deezer: false });
    expect(sockets.sources()).toEqual({ youtube: true, deezer: false });
  });
});
