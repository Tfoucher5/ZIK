import { describe, it, expect } from "vitest";
import { pushMessageFor, CATEGORY_OF_TYPE } from "../pushMessages.js";

const notif = (
  type,
  payload = {},
  actor = { username: "lea", avatar_url: "https://a/x.png" },
) => ({
  id: "n1",
  type,
  payload,
  actor,
});

describe("pushMessageFor", () => {
  it("chaque type de la cloche a une catégorie et un message", () => {
    for (const type of Object.keys(CATEGORY_OF_TYPE)) {
      const msg = pushMessageFor(
        notif(type, { number: 12, title: "T", roomId: "ABC123" }),
      );
      expect(msg.title).toBeTruthy();
      expect(msg.body).toBeTruthy();
      expect(msg.url.startsWith("/")).toBe(true);
    }
  });

  it("invitation : lien vers la room", () => {
    const msg = pushMessageFor(
      notif("room_invite", { roomId: "ABC123", roomName: "Rap FR" }),
    );
    expect(msg.url).toBe("/room/ABC123");
    expect(msg.body).toContain("Rap FR");
  });

  it("set presque fini : room si connue, sinon la collection, sans titre de la carte manquante", () => {
    const withRoom = pushMessageFor(
      notif(
        "card_set_near",
        {
          kind: "album",
          setName: "Discovery",
          roomCode: "XYZ",
          roomName: "Électro",
        },
        null,
      ),
    );
    expect(withRoom.url).toBe("/room/XYZ");
    expect(withRoom.body).toContain("l'album Discovery");
    expect(withRoom.body).toContain("Électro");

    const noRoom = pushMessageFor(
      notif("card_set_near", { kind: "artist", setName: "Daft Punk" }, null),
    );
    expect(noRoom.url).toBe("/collection");
    expect(noRoom.body).toContain("l'artiste Daft Punk");
  });

  it("type inconnu : pas de notification d'appareil", () => {
    expect(pushMessageFor(notif("autre"))).toBeNull();
  });
});
