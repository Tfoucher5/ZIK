import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  match: vi.fn(),
  rows: [],
  updates: [],
  updateError: null,
  selectError: null,
  count: 0,
  filters: [],
}));

vi.mock("../deezer.js", () => ({ deezerIdMatch: m.match }));
vi.mock("../../../config.js", () => {
  const q = () => {
    const c = {
      select: (_f, opts) => {
        c.head = opts?.head;
        return c;
      },
      is: (col, v) => {
        m.filters.push([col, v]);
        return c.head
          ? (c.isCount = (c.isCount ?? 0) + 1) === 2
            ? Promise.resolve({ count: m.count, error: null })
            : c
          : c;
      },
      order: () => c,
      limit: async () => ({ data: m.rows, error: m.selectError }),
      update: (v) => ({
        eq: async (_col, id) => {
          if (m.updateError) return { error: m.updateError };
          m.updates.push({ id, ...v });
          return { error: null };
        },
      }),
    };
    return c;
  };
  const sb = { schema: () => sb, from: q };
  return { getAdminClient: () => sb };
});

const { fillDeezerIds, remaining } = await import("../deezerIds.js");

beforeEach(() => {
  m.match.mockReset();
  m.rows = [];
  m.updates.length = 0;
  m.updateError = null;
  m.selectError = null;
  m.count = 0;
  m.filters.length = 0;
});

describe("remplissage des identifiants Deezer", () => {
  it("trouvé : id enregistré ; non trouvé : marqué vérifié sans id", async () => {
    m.rows = [
      { id: "a", artist: "Stromae", title: "Papaoutai" },
      { id: "b", artist: "Inconnu", title: "Rien" },
    ];
    m.match.mockImplementation(async (artist) =>
      artist === "Stromae" ? "2" : null,
    );
    m.count = 12;
    const res = await fillDeezerIds();
    expect(res).toEqual({ checked: 2, found: 1, failed: 0, left: 12 });
    expect(m.updates.find((u) => u.id === "a").deezer_id).toBe("2");
    const b = m.updates.find((u) => u.id === "b");
    expect(b.deezer_id).toBeNull();
    expect(b.deezer_checked_at).toBeTruthy();
  });

  it("Deezer en panne : rien n'est marqué, le titre sera repris", async () => {
    m.rows = Array.from({ length: 12 }, (_, i) => ({
      id: `t${i}`,
      artist: "A",
      title: "T",
    }));
    m.match.mockRejectedValue(new Error("quota"));
    const res = await fillDeezerIds();
    expect(res).toMatchObject({ checked: 0, found: 0, failed: 5 });
    expect(m.updates).toEqual([]);
    // Lot arrêté au premier paquet : pas 12 recherches dans le vide
    expect(m.match).toHaveBeenCalledTimes(5);
  });

  it("écriture refusée : comptée à reprendre", async () => {
    m.rows = [{ id: "a", artist: "A", title: "T" }];
    m.match.mockResolvedValue("9");
    m.updateError = { message: "panne" };
    expect(await fillDeezerIds()).toMatchObject({ found: 0, failed: 1 });
  });

  it("id numérique déjà connu : recopié sans appel Deezer", async () => {
    m.rows = [{ id: "a", artist: "A", title: "T", external_id: "314" }];
    expect(await fillDeezerIds()).toMatchObject({ checked: 1, found: 1 });
    expect(m.updates[0].deezer_id).toBe("314");
    expect(m.match).not.toHaveBeenCalled();
  });

  it("lecture en échec : lève", async () => {
    m.selectError = { message: "panne" };
    await expect(fillDeezerIds()).rejects.toThrow("panne");
  });

  it("plus de titres à vérifier : lot vide", async () => {
    expect(await fillDeezerIds()).toEqual({
      checked: 0,
      found: 0,
      failed: 0,
      left: 0,
    });
    expect(m.match).not.toHaveBeenCalled();
  });

  it("titres restants : sans id et jamais vérifiés", async () => {
    m.count = 5;
    expect(await remaining()).toBe(5);
    expect(m.filters).toEqual([
      ["deezer_id", null],
      ["deezer_checked_at", null],
    ]);
  });
});
