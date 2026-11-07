import { expect, vi } from "vitest";
import { io as connectClient } from "socket.io-client";

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Vrai client Socket.io qui garde tout ce qu'il reçoit
export function vraiClient(port) {
  const socket = connectClient(`http://localhost:${port}`, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });
  const recus = [];
  socket.onAny((event, data) => recus.push({ event, data }));
  const c = {
    socket,
    recus,
    de: (event) => recus.filter((r) => r.event === event).map((r) => r.data),
    attend: (event, n = 1) =>
      vi.waitFor(
        () => {
          expect(c.de(event).length).toBeGreaterThanOrEqual(n);
          return c.de(event)[n - 1];
        },
        { timeout: 4000, interval: 10 },
      ),
  };
  return c;
}
