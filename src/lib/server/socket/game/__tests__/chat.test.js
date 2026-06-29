import { describe, it, expect, beforeEach, vi } from "vitest";

const chatHistories = {};
vi.mock("../../state.js", () => ({ chatHistories }));

import { getChatHistory, addChatMessage } from "../chat.js";

describe("getChatHistory", () => {
  beforeEach(() => {
    Object.keys(chatHistories).forEach((k) => delete chatHistories[k]);
  });

  it("crée un historique vide pour une room inconnue", () => {
    const h = getChatHistory("room-1");
    expect(h.messages).toEqual([]);
  });
  it("retourne le même objet pour la même room", () => {
    expect(getChatHistory("room-1")).toBe(getChatHistory("room-1"));
  });
});

describe("addChatMessage", () => {
  beforeEach(() => {
    Object.keys(chatHistories).forEach((k) => delete chatHistories[k]);
  });

  it("ajoute un message à l'historique", () => {
    const msg = { name: "Alice", text: "Salut", ts: Date.now() };
    addChatMessage("room-1", msg);
    expect(getChatHistory("room-1").messages).toHaveLength(1);
    expect(getChatHistory("room-1").messages[0]).toBe(msg);
  });
  it("limite l'historique à 50 messages max", () => {
    for (let i = 0; i < 55; i++)
      addChatMessage("room-1", { name: "u", text: `msg${i}`, ts: i });
    expect(getChatHistory("room-1").messages.length).toBeLessThanOrEqual(50);
  });
});
