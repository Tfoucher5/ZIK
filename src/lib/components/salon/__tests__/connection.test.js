import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { watchConnection } from "../connection.js";

function fauxSocket() {
  const h = {};
  return { on: (e, f) => (h[e] = f), h };
}

afterEach(() => vi.useRealTimers());

describe("perte de connexion d'un écran", () => {
  it("signalée après le délai, effacée au retour", () => {
    vi.useFakeTimers();
    const s = fauxSocket();
    const etats = [];
    watchConnection(s, (v) => etats.push(v), 3000, null);
    s.h.disconnect("transport close");
    vi.advanceTimersByTime(2999);
    expect(etats).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(etats).toEqual([true]);
    s.h.connect();
    expect(etats).toEqual([true, false]);
  });

  it("micro-coupure : rien ne s'affiche", () => {
    vi.useFakeTimers();
    const s = fauxSocket();
    const etats = [];
    watchConnection(s, (v) => etats.push(v), 3000, null);
    s.h.disconnect("ping timeout");
    vi.advanceTimersByTime(1000);
    s.h.connect();
    vi.advanceTimersByTime(5000);
    expect(etats).toEqual([false]);
  });

  it("déconnexion voulue (quitter la soirée) : jamais signalée", () => {
    vi.useFakeTimers();
    const s = fauxSocket();
    const etats = [];
    watchConnection(s, (v) => etats.push(v), 3000, null);
    s.h.disconnect("io client disconnect");
    vi.advanceTimersByTime(10_000);
    expect(etats).toEqual([]);
  });
});

describe("réseau coupé annoncé par le navigateur", () => {
  it("signalé sans attendre que le serveur ne réponde plus", () => {
    vi.useFakeTimers();
    const s = { ...fauxSocket(), connected: true };
    const ecoute = {};
    const win = {
      addEventListener: (e, f) => (ecoute[e] = f),
      removeEventListener: (e) => delete ecoute[e],
    };
    const etats = [];
    const stop = watchConnection(s, (v) => etats.push(v), 3000, win);
    ecoute.offline();
    vi.advanceTimersByTime(3000);
    expect(etats).toEqual([true]);
    ecoute.online();
    expect(etats).toEqual([true, false]);
    stop();
    expect(ecoute).toEqual({});
  });
});

// Vrai serveur et vrai client : connect() seul ne fait rien pendant l'attente
// de la prochaine tentative de reconnexion
describe("reconnexion immédiate au retour du réseau ou de l'écran", () => {
  let http, server, client;
  const ecoute = {};
  const doc = {
    visibilityState: "visible",
    addEventListener: (e, f) => (ecoute[e] = f),
    removeEventListener: (e) => delete ecoute[e],
  };
  const win = { ...doc, document: doc };
  const attend = (cond) =>
    vi.waitFor(() => expect(cond()).toBe(true), { timeout: 1500 });

  beforeEach(async () => {
    http = createServer();
    server = new Server(http);
    await new Promise((r) => http.listen(0, r));
    // Attente de reconnexion longue : seule notre relance peut la raccourcir
    client = ioClient(`http://localhost:${http.address().port}`, {
      transports: ["websocket"],
      reconnectionDelay: 60_000,
      reconnectionDelayMax: 60_000,
      randomizationFactor: 0,
    });
    await attend(() => client.connected);
    watchConnection(client, () => {}, 3000, win);
  });
  afterEach(async () => {
    client.disconnect();
    await new Promise((r) => server.close(r));
  });

  const coupe = async () => {
    for (const s of server.sockets.sockets.values()) s.conn.close();
    await attend(() => !client.connected);
  };

  it("réseau revenu : reconnecté sans attendre", async () => {
    await coupe();
    ecoute.online();
    await attend(() => client.connected);
  });

  it("écran rallumé : reconnecté sans attendre", async () => {
    await coupe();
    doc.visibilityState = "hidden";
    ecoute.visibilitychange();
    expect(client.connected).toBe(false);
    doc.visibilityState = "visible";
    ecoute.visibilitychange();
    await attend(() => client.connected);
  });

  it("après un départ voulu, jamais de reconnexion", async () => {
    await coupe();
    client.disconnect();
    ecoute.online();
    ecoute.visibilitychange();
    await new Promise((r) => setTimeout(r, 300));
    expect(client.connected).toBe(false);
  });
});
