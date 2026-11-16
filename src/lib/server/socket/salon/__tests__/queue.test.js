import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  freezeAndSaveAll: async () => {},
  purgeSnapshots: async () => {},
  dropSnapshot: async () => {},
  restoreSalon: async () => {},
}));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
const alertes = vi.hoisted(() => []);
vi.mock("../../../services/admin/alerts.js", () => ({
  alertAdminsSafe: (kind) => alertes.push(kind),
}));

const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { kickPlayer } = await import("../players.js");
const { admitWaiting } = await import("../queue.js");
const { proForHost } = await import("../pro.js");
const { supportGiftPro } = await import("../admin.js");
const { CODE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

const SECRETS = /Secret|Zorglub|vid-secret|audio-secret/;
let h;

function phone(id) {
  const s = makeSocket(id, h.rooms);
  s.recus = [];
  s.emit = (event, data) => s.recus.push({ event, data });
  s.de = (e) => s.recus.filter((r) => r.event === e).map((r) => r.data);
  h.io.sockets.sockets.set(id, s);
  h.connecte(s);
  return s;
}
async function arrive(id, username, extra = {}) {
  const s = phone(id);
  await s.handlers.salon_join_player({ code: CODE, username, ...extra });
  return s;
}
async function coupe(s) {
  h.io.sockets.sockets.delete(s.id);
  for (const r of s.propres) s.leave(r);
  await s.handlers.disconnect();
}
const salon = () => salonRooms[CODE];
const file = () => (salon().waiting ?? []).map((w) => w.username);
const dans = (s, room) => !!h.rooms.get(room)?.has(s.id);
const ventes = () =>
  h.emissions.filter((e) => e.event === "salon_pro_required");

let joueurs;
beforeEach(async () => {
  for (const k of Object.keys(salonRooms)) delete salonRooms[k];
  alertes.length = 0;
  salonDeTest();
  h = makeIo();
  registerSalon(h.io);
  joueurs = [];
  for (let i = 1; i <= 12; i++) joueurs.push(await arrive(`p${i}`, `J${i}`));
});

describe("file d'attente des refusés", () => {
  it("13e avec wait : en file, hors de la partie, un signal de vente", async () => {
    const w = await arrive("w1", "Lea", { wait: true });
    const [attente] = w.de("salon_waiting");
    expect(attente.username).toBe("Lea");
    expect(attente.token).toMatch(/^[\w-]{16}$/);
    expect(file()).toEqual(["Lea"]);
    expect(salon().players.Lea).toBeUndefined();
    expect(dans(w, `salon:players:${CODE}`)).toBe(false);
    expect(dans(w, `salon:${CODE}`)).toBe(false);
    expect(dans(w, `salon:wait:${CODE}`)).toBe(true);
    expect(w.salonCode).toBeUndefined();
    expect(ventes()).toHaveLength(1);
    expect(ventes()[0].cibles).toEqual([`salon:ctrl:${CODE}`]);
    expect(salon().limitHits).toBe(1);
    expect(alertes).toEqual(["admin_upsell"]);
  });

  it("13e sans wait (ancien téléphone) : refus identique, pas de file", async () => {
    const w = await arrive("w1", "Lea");
    expect(w.de("salon_error")).toEqual([{ message: "Le salon est complet." }]);
    expect(w.de("salon_waiting")).toEqual([]);
    expect(salon().waiting).toBeUndefined();
    expect(salon().limitHits).toBe(1);
    expect(ventes()).toHaveLength(1);
  });

  it("place libérée au lobby : le premier connecté entre, l'absent garde son rang", async () => {
    const a = await arrive("w1", "Ana", { wait: true });
    const b = await arrive("w2", "Bob", { wait: true });
    const c = await arrive("w3", "Cy", { wait: true });
    await coupe(a);
    kickPlayer(salon(), "J1", h.io);
    expect(b.de("salon_joined")).toHaveLength(1);
    expect(salon().players.Bob).toBeDefined();
    expect(dans(b, `salon:players:${CODE}`)).toBe(true);
    expect(dans(b, `salon:wait:${CODE}`)).toBe(false);
    expect(b.salonWait).toBeNull();
    expect(c.de("salon_joined")).toEqual([]);
    expect(file()).toEqual(["Ana", "Cy"]);
    // Ana revient avec son jeton : même rang, aucun nouveau signal de vente
    const token = a.de("salon_waiting")[0].token;
    const a2 = await arrive("w1b", "Ana", { wait: true, token });
    expect(a2.de("salon_waiting")).toEqual([{ username: "Ana", token }]);
    expect(file()).toEqual(["Ana", "Cy"]);
    expect(salon().limitHits).toBe(3);
    expect(ventes()).toHaveLength(3);
  });

  it("retiré en pleine manche : une seule admission, à 0 point, sans la réponse", async () => {
    Object.assign(salon().game, {
      phase: "round",
      currentRound: 1,
      currentTrack: {
        title: "Secret",
        artist: "Zorglub",
        videoId: "vid-secret",
        audioUrl: "audio-secret",
      },
    });
    salon().players.J2.score = 300;
    const a = await arrive("w1", "Ana", { wait: true });
    const b = await arrive("w2", "Bob", { wait: true });
    expect(kickPlayer(salon(), "J1", h.io)).toBe(true);
    const [vue] = a.de("salon_joined");
    expect(vue.score).toBe(0);
    expect(JSON.stringify(a.recus)).not.toMatch(SECRETS);
    expect(b.de("salon_joined")).toEqual([]);
    expect(file()).toEqual(["Bob"]);
  });

  it("absent depuis plus de 10 min : retiré de la file au passage suivant", async () => {
    const a = await arrive("w1", "Ana", { wait: true });
    const b = await arrive("w2", "Bob", { wait: true });
    await coupe(a);
    salon().waiting[0].leftAt = Date.now() - 11 * 60 * 1000;
    kickPlayer(salon(), "J1", h.io);
    expect(b.de("salon_joined")).toHaveLength(1);
    expect(salon().waiting).toBeUndefined();
  });

  it("paiement : le salon passe Pro, toute la file connectée entre", async () => {
    salon().hostUserId = "u1";
    const a = await arrive("w1", "Ana", { wait: true });
    const b = await arrive("w2", "Bob", { wait: true });
    expect(proForHost("u1", h.io)).toBe(1);
    expect(a.de("salon_joined")).toHaveLength(1);
    expect(b.de("salon_joined")).toHaveLength(1);
    expect(Object.keys(salon().players)).toHaveLength(14);
    expect(salon().waiting).toBeUndefined();
  });

  it("Pro offert par le support : la file entre", async () => {
    const a = await arrive("w1", "Ana", { wait: true });
    supportGiftPro(CODE);
    expect(salon().proGift).toBe(true);
    expect(a.de("salon_joined")).toHaveLength(1);
    expect(salon().waiting).toBeUndefined();
  });

  it("rechargement au lobby avec une file : place gardée 30 s, puis cédée", async () => {
    vi.useFakeTimers();
    try {
      const a = await arrive("w1", "Ana", { wait: true });
      const token = salon().players.J1.token;
      await coupe(joueurs[0]);
      expect(salon().players.J1).toBeDefined();
      expect(a.de("salon_joined")).toEqual([]);
      const retour = await arrive("p1b", "J1", { token });
      expect(retour.de("salon_joined")[0].reconnecting).toBe(true);
      vi.advanceTimersByTime(31_000);
      expect(a.de("salon_joined")).toEqual([]);
      expect(file()).toEqual(["Ana"]);

      await coupe(joueurs[1]);
      vi.advanceTimersByTime(29_000);
      expect(a.de("salon_joined")).toEqual([]);
      vi.advanceTimersByTime(2_000);
      expect(salon().players.J2).toBeUndefined();
      expect(a.de("salon_joined")).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("en file ailleurs : quitte la file avant d'entrer, jamais admis deux fois", async () => {
    const a = await arrive("w1", "Ana", { wait: true });
    const A = salon();
    salonDeTest();
    salonRooms.AUTRE = Object.assign(salonRooms[CODE], { code: "AUTRE" });
    salonRooms[CODE] = A;
    await a.handlers.salon_join_player({ code: "AUTRE", username: "Ana" });
    expect(salonRooms.AUTRE.players.Ana).toBeDefined();
    expect(file()).toEqual([]);
    expect(dans(a, `salon:wait:${CODE}`)).toBe(false);
    // Entrée restée en file sur un socket déjà dans un salon : ignorée
    A.waiting = [{ username: "Ana", token: "t", socketId: a.id }];
    kickPlayer(A, "J1", h.io);
    expect(A.players.Ana).toBeUndefined();
    expect(a.de("salon_joined")).toHaveLength(1);
    expect(() => admitWaiting(A, undefined)).not.toThrow();
  });

  it("salon_queue_leave : sort de la file, sans effet hors file", async () => {
    const a = await arrive("w1", "Ana", { wait: true });
    await a.handlers.salon_queue_leave();
    expect(file()).toEqual([]);
    expect(dans(a, `salon:wait:${CODE}`)).toBe(false);
    await expect(joueurs[1].handlers.salon_queue_leave()).resolves.toBe(
      undefined,
    );
    expect(salon().players.J2).toBeDefined();
  });

  it("banni, pseudo d'un joueur présent, pseudo déjà en file, file pleine", async () => {
    salon().banned.add("troll");
    const t = await arrive("w0", "Troll", { wait: true });
    expect(t.de("salon_error")[0].message).toBe(
      "L'hôte t'a retiré de ce salon.",
    );
    const j = await arrive("w1", "J3", { wait: true });
    expect(j.de("salon_name_taken")).toEqual([{ username: "J3" }]);
    expect(file()).toEqual([]);

    await arrive("w2", "Ana", { wait: true });
    const double = await arrive("w3", "Ana", { wait: true });
    expect(double.de("salon_error")).toEqual([
      { message: "Ce pseudo est déjà pris." },
    ]);
    expect(salon().limitHits).toBe(1);

    for (let i = 0; i < 199; i++)
      salon().waiting.push({ username: `f${i}`, token: `t${i}` });
    const trop = await arrive("w4", "Zed", { wait: true });
    expect(trop.de("salon_error")).toEqual([
      { message: "Le salon est complet." },
    ]);
    expect(salon().waiting).toHaveLength(200);
  });

  it("une admission qui lève est journalisée, le suivant est servi", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const a = await arrive("w1", "Ana", { wait: true });
    const b = await arrive("w2", "Bob", { wait: true });
    a.leave = () => {
      throw new Error("boom");
    };
    delete salon().players.J1;
    admitWaiting(salon(), h.io);
    expect(errors).toHaveBeenCalled();
    expect(b.de("salon_joined")).toHaveLength(1);
    errors.mockRestore();
  });

  it("après une reprise : personne n'entre sur un socket mort, le jeton garde le rang", async () => {
    const a = await arrive("w1", "Ana", { wait: true });
    await arrive("w2", "Bob", { wait: true });
    const token = a.de("salon_waiting")[0].token;
    // Redémarrage : file relue en JSON, plus aucun socket vivant
    salon().waiting = JSON.parse(JSON.stringify(salon().waiting));
    h.io.sockets.sockets.clear();
    for (const p of joueurs.slice(1)) h.io.sockets.sockets.set(p.id, p);
    delete salon().players.J1;
    admitWaiting(salon(), h.io);
    expect(file()).toEqual(["Ana", "Bob"]);
    expect(Object.keys(salon().players)).toHaveLength(11);
    const a2 = await arrive("w1b", "Ana", { wait: true, token });
    expect(a2.de("salon_joined")).toHaveLength(1);
    expect(file()).toEqual(["Bob"]);
  });
});
