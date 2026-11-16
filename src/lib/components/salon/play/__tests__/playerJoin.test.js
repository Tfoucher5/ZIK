import { describe, it, expect, vi, afterEach } from "vitest";
import { listenPlayer } from "../playerEvents.js";
import { quitQueue } from "../playerJoin.js";

function ecoute(p) {
  const handlers = {};
  const socket = { on: (evt, fn) => (handlers[evt] = fn), disconnect: vi.fn() };
  listenPlayer(p, socket, "KZ4P2M", "Lina");
  return { h: handlers, socket };
}

const enFile = () => {
  const p = { joining: true, leave: vi.fn() };
  const r = ecoute(p);
  r.h.salon_waiting({ username: "Lina", token: "jeton-file" });
  return { p, ...r };
};

describe("téléphone en file d'attente", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("soirée complète : le téléphone passe en file et garde le jeton", () => {
    const store = {};
    vi.stubGlobal("localStorage", { setItem: (k, v) => (store[k] = v) });
    const { p } = enFile();
    expect(p).toMatchObject({
      waiting: true,
      joining: false,
      username: "Lina",
      code: "KZ4P2M",
      token: "jeton-file",
    });
    expect(store.zik_salon_player_KZ4P2M).toBe("jeton-file");
    expect(store.salon_user).toBe("Lina");
  });

  it("stockage bloqué : le jeton reste en mémoire", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("bloqué");
      },
    });
    expect(enFile().p.token).toBe("jeton-file");
  });

  it("une place se libère : il entre, le nouveau jeton remplace celui de la file, bandeau d'entrée", () => {
    const { p, h } = enFile();
    h.salon_joined({ username: "Lina", token: "jeton-joueur", roster: {} });
    expect(p).toMatchObject({
      waiting: false,
      admitted: true,
      joined: true,
      token: "jeton-joueur",
      phase: "lobby",
    });
  });

  it("le bandeau reste après une simple reconnexion, pas après une arrivée normale", () => {
    const { p, h } = enFile();
    h.salon_joined({ username: "Lina", token: "t", roster: {} });
    h.salon_joined({ username: "Lina", token: "t", reconnecting: true });
    expect(p.admitted).toBe(true);
    h.salon_joined({ username: "Lina", token: "t", roster: {} });
    expect(p.admitted).toBe(false);
  });

  it("« Quitter la file » : la connexion ne coupe qu'à l'accusé du serveur", () => {
    const envoi = { emit: vi.fn((ev, data, cb) => (envoi.cb = cb)) };
    const socket = {
      connected: true,
      timeout: vi.fn(() => envoi),
      disconnect: vi.fn(),
    };
    const p = { waiting: true, socket };
    quitQueue(p);
    expect(p).toMatchObject({ waiting: false, socket: null });
    expect(socket.timeout).toHaveBeenCalledWith(2000);
    expect(envoi.emit).toHaveBeenCalledWith(
      "salon_queue_leave",
      {},
      expect.any(Function),
    );
    expect(socket.disconnect).not.toHaveBeenCalled();
    envoi.cb(null);
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it("« Quitter la file » hors ligne : rien n'est envoyé, la connexion est coupée", () => {
    const socket = { connected: false, timeout: vi.fn(), disconnect: vi.fn() };
    const p = { waiting: true, socket };
    quitQueue(p);
    expect(socket.timeout).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(p.waiting).toBe(false);
  });

  it("joueur retiré du lobby puis remis en file : écran de file, puis formulaire s'il quitte", () => {
    const p = { joined: true, joining: false, leave: vi.fn() };
    const { h } = ecoute(p);
    h.salon_waiting({ username: "Lina", token: "jeton-file" });
    expect(p).toMatchObject({ joined: false, waiting: true });
    quitQueue(p);
    expect(p).toMatchObject({ joined: false, waiting: false });
  });

  it("joueur remis en file puis refusé : retour au formulaire avec le message", () => {
    const p = { joined: true, leave: vi.fn() };
    const { h, socket } = ecoute(p);
    h.salon_waiting({ username: "Lina", token: "jeton-file" });
    h.salon_error({ message: "La soirée est complète." });
    expect(p).toMatchObject({
      joined: false,
      waiting: false,
      joinError: "La soirée est complète.",
    });
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it.each(["Ce pseudo est déjà pris.", "La soirée est complète."])(
    "refus « %s » : retour au formulaire avec le message",
    (message) => {
      const { p, h, socket } = enFile();
      h.salon_error({ message });
      expect(p.waiting).toBe(false);
      expect(p.joinError).toBe(message);
      expect(socket.disconnect).toHaveBeenCalled();
    },
  );

  it("pseudo pris par un joueur de la soirée : on quitte la file pour « C'est toi ? »", () => {
    const { p, h } = enFile();
    h.salon_name_taken({ username: "Lina" });
    expect(p.waiting).toBe(false);
    expect(p.nameTaken).toBe("Lina");
  });

  it("soirée fermée pendant l'attente : retour au formulaire avec le message", () => {
    const { p, h } = enFile();
    h.salon_closed({ message: "L'hôte a fermé la soirée." });
    expect(p.leave).toHaveBeenCalled();
    expect(p.waiting).toBe(false);
    expect(p.joinError).toBe("L'hôte a fermé la soirée.");
  });
});
