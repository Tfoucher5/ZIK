import { describe, it, expect, beforeEach, vi } from "vitest";

// Mêmes neutralisations que screens.test.js : aucun appel réseau ni base
vi.mock("../../../config.js", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        in: async () => ({ data: [] }),
      }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: "g1" } }) }),
        then: (r) => r({ error: null }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
  getAdminClient: () => ({
    rpc: async () => ({ data: null, error: null }),
    from: () => ({ insert: () => ({ then: (r) => r({ error: null }) }) }),
  }),
}));
vi.mock("../../game/audio.js", () => ({ validPreviewUrl: () => null }));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
}));
const auth = vi.hoisted(() => ({ user: null }));
vi.mock("../../../middleware/auth.js", () => ({
  verifyToken: async () => auth.user,
}));

const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

describe("reprendre sa place sans son jeton", () => {
  let h;
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    salonDeTest();
    auth.user = null;
    h = makeIo();
    registerSalon(h.io);
  });

  function branche(id) {
    const s = makeSocket(id, h.rooms);
    s.recu = [];
    s.emit = (event, payload) => s.recu.push({ event, payload });
    h.io.sockets.sockets.set(id, s);
    h.connecte(s);
    return s;
  }
  const dernier = (s) => s.recu.at(-1);

  async function telephone(id, username, token, authJwt) {
    const s = branche(id);
    await s.handlers.salon_join_player({
      code: CODE,
      username,
      token,
      auth: authJwt,
    });
    return s;
  }
  function regie() {
    const s = branche("regie");
    s.handlers.salon_join_control({ code: CODE, key: CLE });
    return s;
  }

  it("pseudo pris sans le bon jeton : le téléphone propose « c'est toi ? », rien d'autre", async () => {
    await telephone("t1", "Ana");
    const autre = await telephone("t2", "Ana", "faux");
    expect(dernier(autre)).toEqual({
      event: "salon_name_taken",
      payload: { username: "Ana" },
    });
    expect(salonRooms[CODE].players.Ana.socketId).toBe("t1");
  });

  it("l'hôte confirme : le nouveau téléphone reçoit le jeton et reprend la place, l'ancien est prévenu", async () => {
    const ana = await telephone("t1", "Ana");
    const token = ana.recu.find((e) => e.event === "salon_joined").payload
      .token;
    salonRooms[CODE].players.Ana.score = 300;
    const r = regie();

    const neuf = await telephone("t2", "Ana");
    neuf.handlers.salon_reclaim_request({ code: CODE, username: "Ana" });
    expect(dernier(neuf).event).toBe("salon_reclaim_pending");
    expect(
      h.emissions.find((e) => e.event === "salon_reclaims").payload,
    ).toEqual({ usernames: ["Ana"] });

    r.handlers.salon_reclaim_answer({ username: "Ana", accept: true });
    expect(dernier(neuf).event).toBe("salon_reclaim_ok");
    const nouveau = dernier(neuf).payload.token;
    // Nouveau jeton : l'ancien appareil ne peut plus reprendre la place
    expect(nouveau).not.toBe(token);
    expect(salonRooms[CODE]._reclaims).toEqual({});

    await neuf.handlers.salon_join_player({
      code: CODE,
      username: "Ana",
      token: nouveau,
    });
    expect(salonRooms[CODE].players.Ana).toMatchObject({
      socketId: "t2",
      score: 300,
    });
    expect(ana.recu.at(-1).event).toBe("salon_closed");
    const ancien = await telephone("t3", "Ana", token);
    expect(dernier(ancien).event).toBe("salon_name_taken");
  });

  it("deux demandes pour le même pseudo : la seconde est refusée, le jeton va à la première", async () => {
    await telephone("t1", "Ana");
    const r = regie();
    const a = await telephone("t2", "Ana");
    const b = await telephone("t3", "Ana");
    a.handlers.salon_reclaim_request({ code: CODE, username: "Ana" });
    b.handlers.salon_reclaim_request({ code: CODE, username: "Ana" });
    expect(dernier(b).event).toBe("salon_error");
    r.handlers.salon_reclaim_answer({ username: "Ana", accept: true });
    expect(dernier(a).event).toBe("salon_reclaim_ok");
    expect(b.recu.some((e) => e.event === "salon_reclaim_ok")).toBe(false);
  });

  it("téléphone parti pendant sa demande : la régie n'affiche plus la ligne", async () => {
    await telephone("t1", "Ana");
    regie();
    const neuf = await telephone("t2", "Ana");
    neuf.handlers.salon_reclaim_request({ code: CODE, username: "Ana" });
    neuf.deconnecte();
    expect(salonRooms[CODE]._reclaims).toEqual({});
    expect(
      h.emissions.filter((e) => e.event === "salon_reclaims").at(-1).payload,
    ).toEqual({ usernames: [] });
  });

  it("joueur revenu de lui-même avec son jeton : sa demande disparaît", async () => {
    const ana = await telephone("t1", "Ana");
    const token = ana.recu.find((e) => e.event === "salon_joined").payload
      .token;
    regie();
    const neuf = await telephone("t2", "Ana");
    neuf.handlers.salon_reclaim_request({ code: CODE, username: "Ana" });
    await telephone("t3", "Ana", token);
    expect(salonRooms[CODE]._reclaims).toEqual({});
  });

  it("l'hôte refuse : message clair, pas de jeton", async () => {
    await telephone("t1", "Ana");
    const r = regie();
    const neuf = await telephone("t2", "Ana");
    neuf.handlers.salon_reclaim_request({ code: CODE, username: "Ana" });
    r.handlers.salon_reclaim_answer({ username: "Ana", accept: false });
    expect(dernier(neuf).event).toBe("salon_error");
    expect(neuf.recu.some((e) => e.event === "salon_reclaim_ok")).toBe(false);
  });

  it("seule la régie peut rendre une place", async () => {
    await telephone("t1", "Ana");
    const neuf = await telephone("t2", "Ana");
    neuf.handlers.salon_reclaim_request({ code: CODE, username: "Ana" });
    neuf.handlers.salon_reclaim_answer({ username: "Ana", accept: true });
    expect(neuf.recu.some((e) => e.event === "salon_reclaim_ok")).toBe(false);
  });

  it("même compte ZIK : la place est reprise sans demander à l'hôte", async () => {
    auth.user = { id: "u1" };
    await telephone("t1", "Ana", null, "jwt");
    const vieux = await telephone("t1b", "Ana", null, "jwt");
    const neuf = await telephone("t2", "Ana", null, "jwt");
    expect(vieux.recu.at(-1).event).toBe("salon_closed");
    expect(neuf.recu.some((e) => e.event === "salon_joined")).toBe(true);
    expect(salonRooms[CODE].players.Ana.socketId).toBe("t2");
  });

  it("entrées hostiles : rien ne casse, rien n'est donné", async () => {
    await telephone("t1", "Ana");
    const s = branche("x");
    for (const p of [
      null,
      {},
      { code: CODE, username: "__proto__" },
      { code: "__proto__", username: "Ana" },
      { code: CODE, username: "x".repeat(500) },
      { code: CODE, username: "Inconnu" },
    ])
      s.handlers.salon_reclaim_request(p);
    for (const p of [null, { username: "Ana" }, { username: 1, accept: true }])
      s.handlers.salon_reclaim_answer(p);
    expect(s.recu.some((e) => e.event === "salon_reclaim_ok")).toBe(false);
    expect(salonRooms[CODE]._reclaims).toBeUndefined();
  });
});
