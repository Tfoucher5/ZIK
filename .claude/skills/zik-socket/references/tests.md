# Gabarits de tests temps réel

## Entrées hostiles d'un handler

```js
import { describe, it, expect } from "vitest";

const HOSTILE = [
  undefined,
  null,
  42,
  true,
  [],
  ["a"],
  {},
  { guess: 42 },
  { guess: "x".repeat(1_000_000) },
  "texte",
];

describe("salon_submit_guess — entrées hostiles", () => {
  it.each(HOSTILE)("ignore %j sans lever", async (payload) => {
    const { socket, emit } = fakeSocket(); // helper existant ou à créer dans __tests__/helpers
    registerAnswers(socket, fakeIO());
    await expect(emit("salon_submit_guess", payload)).resolves.not.toThrow();
  });
});
```

## Partie complète en intégration

Démarre un vrai serveur Socket.io sur un port libre, connecte des `socket.io-client`, simule les médias.

```js
import { createServer } from "http";
import { Server } from "socket.io";
import { io as client } from "socket.io-client";

let httpServer, io, port;
beforeAll(async () => {
  httpServer = createServer();
  io = new Server(httpServer);
  registerSalon(io);
  await new Promise((r) => httpServer.listen(0, r));
  port = httpServer.address().port;
});
afterAll(() => {
  io.close();
  httpServer.close();
});

const connect = () =>
  client(`http://localhost:${port}`, {
    transports: ["websocket"],
    forceNew: true,
  });
```

Scénario minimal : la TV crée et rejoint le salon avec la clé, la régie rejoint, trois joueurs rejoignent, deux manches de 1 s, un joueur se déconnecte puis revient, fin de partie. Vérifie le classement final, les partants compris.

## Instantané

```js
it("survit à un aller-retour d'instantané", () => {
  const salon = buildSalonInGame(); // phase round, scores, équipes, un joueur parti
  const restored = restoreSalon(
    JSON.parse(JSON.stringify(serializeSalon(salon))),
  );
  expect(restored.players).toEqual(salon.players);
  expect(restored.departed).toEqual(salon.departed);
  expect(restored.game.phase).toBe(salon.game.phase);
});
```

## Ce qui ne doit jamais partir vers les téléphones

```js
it("n'envoie ni média ni réponse aux joueurs", async () => {
  const sent = captureEmits(io, "salon:players:ABC123");
  await startRound("ABC123", io);
  for (const [, data] of sent) {
    expect(JSON.stringify(data)).not.toMatch(
      /videoId|audioUrl|"title"|"artist"/,
    );
  }
});
```
