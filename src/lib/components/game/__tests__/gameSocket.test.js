import { describe, it, expect, vi } from "vitest";

const socket = vi.hoisted(() => {
  const handlers = {};
  return {
    id: "s1",
    handlers,
    on: (evt, fn) => (handlers[evt] = fn),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
});
vi.mock("socket.io-client", () => ({ io: () => socket }));

const { joinRoom } = await import("../gameSocket.js");

const handlersPage = new Proxy({}, { get: () => () => {} });
const envois = () => socket.emit.mock.calls.map(([, p]) => p);
const attendEnvois = (n) =>
  vi.waitFor(() => expect(socket.emit).toHaveBeenCalledTimes(n));

describe("connexion à une room", () => {
  it("un seul join_room au départ, puis l'id précédent à chaque reconnexion", async () => {
    await joinRoom(handlersPage, async (extra = {}) => ({
      roomId: "R",
      ...extra,
    }));
    socket.handlers.connect();
    await attendEnvois(1);
    expect(envois()[0]).toEqual({ roomId: "R" });

    socket.id = "s2";
    socket.handlers.connect();
    await attendEnvois(2);
    expect(envois()[1]).toEqual({ roomId: "R", prevSid: "s1" });

    socket.id = "s3";
    socket.handlers.connect();
    await attendEnvois(3);
    expect(envois()[2].prevSid).toBe("s2");
  });
});
