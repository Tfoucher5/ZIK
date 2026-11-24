import { describe, it, expect, beforeEach, vi } from "vitest";

// Fausse base : un seul salon a un instantané
const db = vi.hoisted(() => ({ lectures: 0, instantane: null }));
vi.mock("#lib/server/config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    schema: (s) =>
      s === "salon"
        ? {
            rpc: async (fn, a) => {
              if (fn !== "load_salon_snapshot")
                return { data: null, error: null };
              db.lectures++;
              return a.p_code === "REPRIS" && db.instantane
                ? {
                    data: [
                      { code: "REPRIS", data: structuredClone(db.instantane) },
                    ],
                  }
                : { data: [], error: null };
            },
          }
        : null,
  }),
}));

const { salonRooms } = await import("#lib/server/state.js");
const { serializeSalon } = await import("#lib/server/socket/salon/snapshot.js");
const { GET, _missesByIp } = await import("../+server.js");

const appel = (code, ip = "1.1.1.1", reelle) =>
  GET({
    request: new Request("http://x", {
      headers: {
        "x-forwarded-for": ip,
        ...(reelle && { "x-real-ip": reelle }),
      },
    }),
    url: new URL(`http://x/api/salon?code=${code}`),
  });
const demande = async (code, ip, reelle) =>
  (await appel(code, ip, reelle)).status;

// Chaque test repart d'une fenêtre de recherches vide
vi.useFakeTimers({ toFake: ["Date"] });

describe("GET /api/salon : la soirée est-elle encore ouverte ?", () => {
  beforeEach(() => {
    vi.setSystemTime(Date.now() + 61_000);
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    const titre = { id: "t", title: "T", artist: "A" };
    db.instantane = serializeSalon({
      code: "REPRIS",
      settings: { answerMode: "free" },
      players: {},
      banned: new Set(),
      game: {
        phase: "lobby",
        currentRound: 0,
        fullPlaylist: [titre],
        sessionPlaylist: [titre],
        played: [],
        history: [],
      },
    });
  });

  it("entrées hostiles : refusées sans planter", async () => {
    for (const code of ["__proto__", "", "AB", "A".repeat(40), "ab$12"])
      expect(await demande(encodeURIComponent(code)), code).toBe(400);
    expect(db.lectures).toBe(0);
    // Mis en majuscules, un nom de propriété d'objet n'est qu'un code inconnu
    expect(await demande("constructor")).toBe(404);
  });

  it("salon présent seulement dans son instantané (juste après un redémarrage) : ouvert", async () => {
    expect(await demande("REPRIS")).toBe(200);
    expect(salonRooms.REPRIS).toBeDefined();
  });

  it("salon fermé : 404 et message clair", async () => {
    expect(await demande("FERME1")).toBe(404);
    const res = await appel("FERME2");
    expect((await res.json()).error).toBe("Cette soirée n'existe plus.");
  });

  it("trop de recherches ratées : « réessayez », jamais un faux « fermé »", async () => {
    for (let i = 0; i < 8; i++) await demande(`HASARD${i}`);
    expect(await demande("REPRIS")).toBe(503);
  });

  it("les ratés d'une adresse ne bloquent pas les joueurs d'une autre", async () => {
    for (let i = 0; i < 5; i++) await demande(`HASARD${i}`, "6.6.6.6");
    expect(await demande("REPRIS", "6.6.6.6")).toBe(503);
    expect(await demande("REPRIS", "2.2.2.2")).toBe(200);
  });

  it("adresses falsifiées en rafale : le plafond global coupe, puis la fenêtre repart", async () => {
    for (let i = 0; i < 200; i++)
      expect(await demande(`HASARD${i}`, `10.0.${i >> 8}.${i & 255}`)).toBe(
        404,
      );
    const lectures = db.lectures;
    expect(await demande("REPRIS", "2.2.2.2")).toBe(503);
    expect(db.lectures).toBe(lectures);
    vi.setSystemTime(Date.now() + 61_000);
    expect(await demande("REPRIS", "2.2.2.2")).toBe(200);
  });

  it("rafale parallèle d'une adresse : 5 lectures en base, pas une de plus", async () => {
    const avant = db.lectures;
    const statuts = await Promise.all(
      Array.from({ length: 50 }, (_, i) => demande(`PARA${i}`, "7.7.7.7")),
    );
    expect(db.lectures - avant).toBe(5);
    expect(statuts.filter((s) => s === 503)).toHaveLength(45);
  });

  it("rafale parallèle d'adresses falsifiées : le plafond global compte les recherches en cours", async () => {
    const avant = db.lectures;
    await Promise.all(
      Array.from({ length: 300 }, (_, i) =>
        demande(`PARA${i}`, `11.0.${i >> 8}.${i & 255}`),
      ),
    );
    expect(db.lectures - avant).toBe(200);
  });

  it("X-Real-IP prime : changer X-Forwarded-For ne contourne pas le plafond", async () => {
    for (let i = 0; i < 5; i++)
      await demande(`HASARD${i}`, `12.0.0.${i}`, "8.8.8.8");
    expect(await demande("REPRIS", "12.0.0.99", "8.8.8.8")).toBe(503);
  });

  it("salon trouvé : il ne compte pas comme un raté", async () => {
    for (let i = 0; i < 10; i++) {
      delete salonRooms.REPRIS;
      expect(await demande("REPRIS", "9.9.9.9")).toBe(200);
    }
    expect(_missesByIp.has("9.9.9.9")).toBe(false);
  });

  it("table des adresses bornée : les adresses d'avant la fenêtre sont purgées", async () => {
    for (let i = 0; i < 200; i++) await demande(`HASARD${i}`, `13.0.0.${i}`);
    vi.setSystemTime(Date.now() + 61_000);
    for (let i = 0; i < 5; i++) await demande(`NEUF${i}`, `14.0.0.${i}`);
    expect(_missesByIp.size).toBe(5);
  });
});
