import { describe, it, expect, beforeEach, vi } from "vitest";

const alertAdminsSafe = vi.fn();
vi.mock("../../services/adminAlerts.js", () => ({ alertAdminsSafe }));

const { salonRooms, setIO } = await import("../../state.js");
const {
  callSupport,
  sendSupportMessage,
  markAdminJoined,
  closeSupport,
  openSupportCount,
  supportView,
  registerSupport,
  SUPPORT_MAX_MESSAGES,
} = await import("../salonSupport.js");

const CODE = "CHAT01";
let emissions;

function fakeIo() {
  emissions = [];
  setIO({
    to: (cible) => ({
      emit: (event, payload) =>
        emissions.push({ cibles: [].concat(cible), event, payload }),
    }),
  });
}

const dernier = () => emissions.at(-1).payload;

describe("chat de support d'un salon", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    salonRooms[CODE] = { code: CODE };
    alertAdminsSafe.mockClear();
    fakeIo();
  });

  it("ouvre une demande, prévient l'admin et la régie", () => {
    const v = callSupport(CODE, "  La TV ne joue plus rien  ");
    expect(v).toMatchObject({ open: true, adminJoined: false });
    expect(v.requestedAt).toBeTypeOf("number");
    expect(v.messages).toEqual([
      expect.objectContaining({
        from: "host",
        text: "La TV ne joue plus rien",
      }),
    ]);
    expect(alertAdminsSafe).toHaveBeenCalledWith(
      "admin_salons",
      expect.objectContaining({
        title: `Salon ${CODE} : un organisateur appelle un admin`,
        url: `/admin/salons?code=${CODE}`,
        tag: `call:${CODE}`,
      }),
      { throttleMs: 2 * 60 * 1000 },
    );
    expect(emissions[0]).toMatchObject({
      event: "salon_support",
      cibles: [`salon:screens:${CODE}`, `salon:ctrl:${CODE}`],
    });
    expect(openSupportCount()).toBe(1);
  });

  it("accepte un appel sans message", () => {
    expect(callSupport(CODE, "   ").messages).toEqual([]);
    expect(alertAdminsSafe.mock.calls[0][1].body).toMatch(/chat/);
  });

  it("échange dans les deux sens et signale l'admin connecté", () => {
    callSupport(CODE, "Bonjour");
    markAdminJoined(CODE);
    expect(dernier().adminJoined).toBe(true);
    sendSupportMessage(CODE, "admin", "Je regarde ton salon");
    sendSupportMessage(CODE, "host", "Merci !");
    expect(dernier().messages.map((m) => [m.from, m.text])).toEqual([
      ["host", "Bonjour"],
      ["admin", "Je regarde ton salon"],
      ["host", "Merci !"],
    ]);
    expect(() => sendSupportMessage(CODE, "host", "  ")).toThrow(/vide/);
  });

  it("l'admin peut écrire le premier, sans compter comme un appel", () => {
    const v = sendSupportMessage(CODE, "admin", "Le support ZIK est là");
    expect(v).toMatchObject({
      open: true,
      adminJoined: true,
      requestedAt: null,
    });
    expect(openSupportCount()).toBe(0);
    expect(alertAdminsSafe).not.toHaveBeenCalled();
  });

  it("clôt la demande en gardant l'historique", () => {
    callSupport(CODE, "Aide");
    closeSupport(CODE);
    expect(dernier()).toMatchObject({ open: false });
    expect(dernier().closedAt).toBeTypeOf("number");
    expect(dernier().messages).toHaveLength(1);
    expect(openSupportCount()).toBe(0);
    expect(() => closeSupport(CODE)).toThrow(/Aucune demande/);
  });

  it("un message de l'organisateur après la clôture rappelle un admin", () => {
    callSupport(CODE, "Aide");
    closeSupport(CODE);
    sendSupportMessage(CODE, "host", "Encore un souci");
    expect(dernier().open).toBe(true);
    expect(alertAdminsSafe).toHaveBeenCalledTimes(2);
  });

  it("garde les 100 derniers messages", () => {
    callSupport(CODE);
    for (let i = 1; i <= SUPPORT_MAX_MESSAGES + 20; i++)
      sendSupportMessage(CODE, i % 2 ? "host" : "admin", `message ${i}`);
    const { messages } = supportView(salonRooms[CODE]);
    expect(messages).toHaveLength(SUPPORT_MAX_MESSAGES);
    expect(messages[0].text).toBe("message 21");
    expect(messages.at(-1).text).toBe(`message ${SUPPORT_MAX_MESSAGES + 20}`);
  });

  it("coupe les messages trop longs", () => {
    callSupport(CODE, "x".repeat(2000));
    expect(dernier().messages[0].text).toHaveLength(500);
  });

  it("refuse un salon fermé", () => {
    expect(() => callSupport("NOPE00", "Aide")).toThrow(/plus en cours/);
    expect(supportView(salonRooms[CODE])).toBeNull();
  });

  it("n'écoute que la régie et l'écran de l'hôte", () => {
    const handlers = {};
    const socket = { on: (ev, fn) => (handlers[ev] = fn), salonCode: CODE };
    registerSupport(socket);

    const ack = vi.fn();
    handlers.salon_support_call({ message: "Aide" }, ack);
    expect(ack).toHaveBeenCalledWith({ ok: false, error: expect.any(String) });

    socket.salonAdmin = true;
    handlers.salon_support_call({ message: "Aide" }, ack);
    expect(ack.mock.calls[1][0]).toMatchObject({ ok: true });
    handlers.salon_support_send({ text: "Toujours là ?" }, ack);
    expect(ack.mock.calls[2][0].support.messages).toHaveLength(2);
  });
});
