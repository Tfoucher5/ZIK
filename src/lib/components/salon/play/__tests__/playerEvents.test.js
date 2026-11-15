import { describe, it, expect, vi } from "vitest";
import { listenPlayer } from "../playerEvents.js";

describe("téléphone : soirée fermée par l'hôte", () => {
  it("revient au formulaire avec le message, sans reprise possible", () => {
    const handlers = {};
    const socket = { on: (evt, fn) => (handlers[evt] = fn) };
    const p = { joined: true, restarting: true, joinError: "", leave: vi.fn() };
    listenPlayer(p, socket, "ABCDEF", "Ana");

    handlers.salon_closed({ message: "L'hôte a fermé la soirée." });

    expect(p.leave).toHaveBeenCalled();
    expect(p.restarting).toBe(false);
    expect(p.joinError).toBe("L'hôte a fermé la soirée.");
  });
});

describe("téléphone : retour après une coupure en QCM", () => {
  const reprise = (p, data) => {
    const handlers = {};
    const socket = { on: (evt, fn) => (handlers[evt] = fn) };
    globalThis.localStorage ??= { setItem: () => {} };
    listenPlayer(p, socket, "ABCDEF", "Bob");
    handlers.salon_joined({
      username: "Bob",
      reconnecting: true,
      phase: "round",
      settings: { answerMode: "multiple", maxRounds: 5 },
      ...data,
    });
  };

  it("réponse tapée hors ligne en manche 1, retour en manche 2 : on peut répondre", () => {
    const p = { round: 1, chosenIndex: 3, revealCorrectIndex: 1, guess: "x" };
    reprise(p, { round: 2, chosenIndex: null });
    expect(p.round).toBe(2);
    expect(p.chosenIndex).toBeNull();
    expect(p.revealCorrectIndex).toBeNull();
    expect(p.guess).toBe("");
  });

  it("réponse reçue par le serveur avant la coupure : elle reste verrouillée", () => {
    const p = { round: 2, chosenIndex: null };
    reprise(p, { round: 2, chosenIndex: 1 });
    expect(p.chosenIndex).toBe(1);
  });
});
