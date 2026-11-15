import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../snapshot.js", () => ({ saveSnapshot: async () => {} }));
vi.mock("../rounds.js", () => ({ checkEveryoneDone: () => {} }));

const { salonRooms } = await import("../../../state.js");
const { registerAnswers } = await import("../answers.js");
const { addPlayer } = await import("../players.js");
const { CODE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

let socket, emissions;

beforeEach(() => {
  salonDeTest();
  const s = salonRooms[CODE];
  s.settings.answerMode = "multiple";
  Object.assign(s.game, {
    phase: "round",
    timerActive: true,
    startTime: Date.now(),
    choices: ["a", "b", "c", "d"],
    correctChoiceIndex: 2,
    currentTrack: {},
  });
  addPlayer(s, "Ana", "s1");
  const h = makeIo();
  emissions = h.emissions;
  socket = makeSocket("s1", h.rooms);
  socket.salonCode = CODE;
  socket.salonUsername = "Ana";
  registerAnswers(socket, h.io);
});
afterEach(() => delete salonRooms[CODE]);

const choisit = async (payload) => {
  const ack = vi.fn();
  await socket.handlers.salon_submit_choice(payload, ack);
  return ack;
};

describe("QCM : accusé de réception de la réponse", () => {
  it("réponse retenue : l'accusé rend la case", async () => {
    const ack = await choisit({ choiceIndex: 1 });
    expect(ack).toHaveBeenCalledWith(1);
    expect(salonRooms[CODE].players.Ana._choiceIndex).toBe(1);
    expect(emissions.map((e) => e.event)).toContain("salon_player_answered");
  });

  it("renvoi après un accusé perdu : la première réponse reste", async () => {
    await choisit({ choiceIndex: 1 });
    const ack = await choisit({ choiceIndex: 3 });
    expect(ack).toHaveBeenCalledWith(1);
    expect(salonRooms[CODE].players.Ana._choiceIndex).toBe(1);
  });

  it("hors manche ou en pause : refusée, l'accusé le dit", async () => {
    salonRooms[CODE].game.paused = true;
    expect(await choisit({ choiceIndex: 0 })).toHaveBeenCalledWith(null);
    salonRooms[CODE].game.paused = false;
    salonRooms[CODE].game.phase = "roundEnd";
    expect(await choisit({ choiceIndex: 0 })).toHaveBeenCalledWith(null);
    expect(salonRooms[CODE].players.Ana._fullFoundCounted).toBe(false);
  });

  it("case hors des choix proposés : refusée", async () => {
    expect(await choisit({ choiceIndex: 4 })).toHaveBeenCalledWith(null);
    expect(salonRooms[CODE].players.Ana._fullFoundCounted).toBe(false);
  });

  it("entrées hostiles : rien ne casse, aucune réponse retenue", async () => {
    for (const payload of [
      undefined,
      null,
      { choiceIndex: -1 },
      { choiceIndex: 10 },
      { choiceIndex: 1.5 },
      { choiceIndex: "1" },
    ]) {
      const ack = await choisit(payload);
      expect(ack).not.toHaveBeenCalled();
    }
    // Accusé qui n'est pas une fonction : la réponse passe quand même
    for (const ack of [undefined, 42, "x", {}])
      await socket.handlers.salon_submit_choice({ choiceIndex: 2 }, ack);
    expect(salonRooms[CODE].players.Ana._choiceIndex).toBe(2);
  });
});
