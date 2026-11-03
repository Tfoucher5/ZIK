import { describe, it, expect, vi } from "vitest";

// Chaque io() rend un socket factice qu'on peut inspecter
const sockets = [];
vi.mock("socket.io-client", () => ({
  io: () => {
    const s = { on() {}, emit() {}, disconnect: vi.fn() };
    sockets.push(s);
    return s;
  },
}));
vi.mock("../playerEvents.js", () => ({ listenPlayer: () => {} }));

const { SalonPlayer } = await import("../salonPlayer.svelte.js");

function rejoint(p, code) {
  p.codeInput = code;
  p.usernameInput = "Ana";
  p.connectAndJoin();
}

describe("téléphone : une seule connexion à la fois", () => {
  it("changer de salon ferme la connexion à l'ancien", () => {
    const p = new SalonPlayer(null);
    rejoint(p, "AAAAAA");
    rejoint(p, "BBBBBB");
    expect(sockets[0].disconnect).toHaveBeenCalled();
    expect(sockets[1].disconnect).not.toHaveBeenCalled();
  });

  it("« Rejoindre une autre soirée » ferme la connexion : après une coupure, elle ne ramène pas au salon d'avant", () => {
    const p = new SalonPlayer(null);
    rejoint(p, "CCCCCC");
    const s = sockets.at(-1);
    p.leave();
    expect(s.disconnect).toHaveBeenCalled();
    expect(p.socket).toBeNull();
  });
});
