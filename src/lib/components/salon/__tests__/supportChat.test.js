import { describe, it, expect } from "vitest";
import { SupportChat } from "../support/supportChat.svelte.js";

const msg = (id, from) => ({ id, from, text: "x", at: id });
const vue = (messages, open = true) => ({
  open,
  requestedAt: null,
  closedAt: null,
  adminJoined: true,
  messages,
});

describe("chat d'aide côté régie et TV", () => {
  it("l'admin qui écrit le premier déplie le chat sans appel de l'hôte", () => {
    const chat = new SupportChat();
    chat.update(vue([msg(1, "admin")]));
    expect(chat.visible).toBe(true);
    expect(chat.expanded).toBe(true);
    expect(chat.unread).toBe(0);
  });

  it("chat replié : un nouveau message de l'admin compte comme non lu", () => {
    const chat = new SupportChat();
    chat.update(vue([msg(1, "admin")]));
    chat.toggle();
    chat.update(vue([msg(1, "admin"), msg(2, "admin")]));
    expect(chat.expanded).toBe(false);
    expect(chat.unread).toBe(1);
  });

  it("échange clos puis l'admin réécrit : le chat revient déplié", () => {
    const chat = new SupportChat();
    chat.update(vue([msg(1, "admin")]));
    chat.update(vue([msg(1, "admin")], false));
    chat.dismiss();
    chat.update(vue([msg(1, "admin"), msg(2, "admin")]));
    expect(chat.visible).toBe(true);
    expect(chat.expanded).toBe(true);
  });

  it("un échange déjà clos au chargement reste caché", () => {
    const chat = new SupportChat();
    chat.update(vue([msg(1, "admin")], false));
    expect(chat.visible).toBe(false);
  });
});
