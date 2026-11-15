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

  it("buzzer verrouillé et manche spéciale retrouvés, sans rejouer l'intro", () => {
    const p = { round: 2, buzzLocked: false, specialIntro: true };
    reprise(p, {
      round: 2,
      special: "double",
      buzzer: "Ana",
      buzzLocked: true,
    });
    expect(p).toMatchObject({
      special: "double",
      specialIntro: false,
      buzzer: "Ana",
      buzzLocked: true,
    });
  });

  it("décompte annulé pendant la coupure : il s'arrête au retour", () => {
    const handlers = {};
    const socket = { on: (evt, fn) => (handlers[evt] = fn) };
    const p = { round: 2 };
    listenPlayer(p, socket, "ABCDEF", "Bob");
    handlers.salon_countdown({
      kind: "next",
      endsAt: Date.now() + 9_000,
      now: Date.now(),
    });
    expect(p.nextSec).toBeGreaterThan(0);
    handlers.salon_joined({ username: "Bob", reconnecting: true, round: 2 });
    expect(p.nextSec).toBe(0);
  });

  it("serveur sans manche spéciale ni buzz : l'ancien état est effacé", () => {
    const p = { round: 2, special: "double", buzzer: "Ana", buzzLocked: true };
    reprise(p, { round: 3 });
    expect(p).toMatchObject({ special: null, buzzer: null, buzzLocked: false });
  });
});
