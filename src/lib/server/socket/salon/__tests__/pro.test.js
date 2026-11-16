import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const calls = [];
let reponse = { data: null, error: null };
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    schema: () => ({
      rpc: async (fn, args) => {
        calls.push([fn, args]);
        return typeof reponse === "function" ? reponse(fn, args) : reponse;
      },
    }),
  }),
}));
const isPro = vi.fn();
vi.mock("../../../services/pro.js", () => ({ isPro }));

const { salonRooms, setIO } = await import("../../../state.js");
const { grantPro, proForHost, attachSalon } = await import("../pro.js");
const { restoreSalon, serializeSalon, reviveSalon } =
  await import("../snapshot.js");
const { salonEnManche, nettoie, viaBase, titresDe, json } =
  await import("./snapshotHarness.js");

const emissions = [];
const io = {
  to: (cible) => ({
    emit: (event, payload) =>
      emissions.push({ cibles: [].concat(cible), event, payload }),
  }),
  sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
};
const saves = () => calls.filter(([fn]) => fn === "save_salon_snapshot");

function salon(code, hostUserId, pro = false) {
  const s = salonEnManche();
  nettoie(s);
  Object.assign(s, { code, hostUserId, pro, adminKey: `cle-${code}` });
  salonRooms[code] = s;
  return s;
}

beforeEach(() => {
  calls.length = 0;
  emissions.length = 0;
  reponse = { data: null, error: null };
  isPro.mockReset();
  setIO(io);
  for (const k of Object.keys(salonRooms)) delete salonRooms[k];
});
afterEach(() => setIO(null));

describe("grantPro", () => {
  it("prévient la TV et la régie seulement, sauvegarde une fois, 2e appel muet", () => {
    const s = salon("PRO001", "u1");
    expect(grantPro(s, io)).toBe(true);
    expect(s.pro).toBe(true);
    expect(emissions).toEqual([
      {
        cibles: ["salon:screens:PRO001", "salon:ctrl:PRO001"],
        event: "salon_pro",
        payload: { pro: true },
      },
    ]);
    expect(saves().filter(([, a]) => a.p_code === "PRO001")).toHaveLength(1);
    expect(grantPro(s, io)).toBe(false);
    expect(emissions).toHaveLength(1);
    expect(saves().filter(([, a]) => a.p_code === "PRO001")).toHaveLength(1);
    expect(s._journal[0].text).toMatch(/Pro/);
  });

  it("file en cours : salon_pro part avant la file vidée", () => {
    const s = salon("PRO003", "u1");
    s.waiting = [
      { username: "Ana", token: "t", socketId: null, leftAt: Date.now() },
    ];
    grantPro(s, io);
    expect(emissions.map((e) => [e.event, e.cibles, e.payload])).toEqual([
      [
        "salon_pro",
        ["salon:screens:PRO003", "salon:ctrl:PRO003"],
        { pro: true },
      ],
      ["salon_queue", ["salon:ctrl:PRO003"], { count: 0, names: [] }],
      ["salon_queue", ["salon:screens:PRO003"], { count: 0 }],
    ]);
    expect(s.waiting).toBeUndefined();
  });

  it("sans Socket.io : rien ne lève, le salon passe Pro et est sauvegardé", () => {
    const s = salon("PRO002", "u1");
    expect(grantPro(s, null)).toBe(true);
    expect(s.pro).toBe(true);
    expect(emissions).toHaveLength(0);
    expect(saves()).toHaveLength(1);
  });
});

describe("proForHost", () => {
  it("ne bascule que les salons du compte", () => {
    const a = salon("AAAA01", "u1");
    const b = salon("BBBB01", "u1");
    const autre = salon("CCCC01", "u2");
    const invite = salon("DDDD01", null);
    expect(proForHost("u1")).toBe(2);
    expect([a.pro, b.pro, autre.pro, invite.pro]).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(emissions).toHaveLength(2);
    expect(emissions.flatMap((e) => e.cibles).join()).not.toMatch(/players/);
  });

  it("sans compte, aucun salon invité n'est touché", () => {
    const invite = salon("DDDD01", null);
    for (const id of [null, undefined, ""]) expect(proForHost(id)).toBe(0);
    expect(invite.pro).toBe(false);
    expect(emissions).toHaveLength(0);
  });
});

describe("attachSalon", () => {
  it("rattache un salon invité au compte qui paie", () => {
    const s = salon("INV001", null);
    expect(attachSalon("INV001", "cle-INV001", "u1")).toBeNull();
    expect(s.hostUserId).toBe("u1");
    expect(saves()).toHaveLength(1);
    // Même compte : rien ne change
    expect(attachSalon("INV001", "cle-INV001", "u1")).toBeNull();
    expect(saves()).toHaveLength(1);
  });

  it("refuse mauvaise clé, salon d'un autre compte, salon inconnu", () => {
    const s = salon("AUT001", "u2");
    expect(attachSalon("AUT001", "fausse", "u1")?.status).toBe(403);
    expect(attachSalon("AUT001", "cle-AUT001", "u1")?.status).toBe(403);
    expect(s.hostUserId).toBe("u2");
    expect(attachSalon("ZZZZ99", "cle", "u1")?.status).toBe(404);
    expect(saves()).toHaveLength(0);
  });

  it("entrées hostiles : 4xx sans exception ni pollution", () => {
    salon("HOST01", null);
    const gros = "A".repeat(1_000_000);
    for (const code of ["__proto__", "constructor", 42, {}, [], gros, null])
      expect(attachSalon(code, "x", "u1")?.status).toBe(400);
    for (const key of [42, {}, [], gros, null, undefined])
      expect(attachSalon("HOST01", key, "u1")?.status).toBe(403);
    expect(attachSalon("CONSTRUCTOR", "x", "u1")?.status).toBe(404);
    expect({}.hostUserId).toBeUndefined();
    expect(salonRooms.HOST01.hostUserId).toBeNull();
  });
});

describe("reprise après redémarrage", () => {
  async function reprend(modif) {
    const s = salonEnManche();
    Object.assign(s, modif);
    const etat = viaBase(s);
    const titres = titresDe(s);
    nettoie(s);
    reponse = (fn, a) =>
      fn === "load_salon_snapshot"
        ? {
            data: [{ data: a.p_code === "SNAP01" ? etat : titres }],
            error: null,
          }
        : { data: null, error: null };
    await restoreSalon("SNAP01", io, {});
    return salonRooms.SNAP01;
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("hôte passé Pro pendant la coupure : le salon repart Pro", async () => {
    isPro.mockResolvedValue(true);
    const s = await reprend({ pro: false, hostUserId: "u1" });
    expect(isPro).toHaveBeenCalledWith("u1");
    expect(s.pro).toBe(true);
    expect(emissions.map((e) => e.event)).toContain("salon_pro");
  });

  it("hôte non Pro : reste gratuit", async () => {
    isPro.mockResolvedValue(false);
    const s = await reprend({ pro: false, hostUserId: "u1" });
    expect(s.pro).toBe(false);
  });

  it("passe expiré : le salon déjà Pro ne redescend pas, sans lecture", async () => {
    isPro.mockResolvedValue(false);
    const s = await reprend({ pro: true, hostUserId: "u1" });
    expect(s.pro).toBe(true);
    expect(isPro).not.toHaveBeenCalled();
  });

  it("base en panne : le salon repart quand même, gratuit", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    isPro.mockRejectedValue(new Error("fetch failed"));
    const s = await reprend({ pro: false, hostUserId: "u1" });
    expect(s.pro).toBe(false);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("salon invité : aucune lecture de l'abonnement", async () => {
    const s = await reprend({ pro: false, hostUserId: null });
    expect(s.pro).toBe(false);
    expect(isPro).not.toHaveBeenCalled();
  });
});

it("pro, proGift et hostUserId survivent à l'instantané", () => {
  const s = salonEnManche();
  Object.assign(s, { pro: true, proGift: true, hostUserId: "u1" });
  s._playlistAt = 1;
  const revu = reviveSalon(json(serializeSalon(s)), titresDe(s));
  nettoie(s);
  expect(revu).toMatchObject({ pro: true, proGift: true, hostUserId: "u1" });
});
