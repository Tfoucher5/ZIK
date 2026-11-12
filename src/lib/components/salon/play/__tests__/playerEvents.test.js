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
