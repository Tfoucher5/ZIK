import { describe, it, expect } from "vitest";
import {
  pushMessageFor,
  CATEGORY_OF_TYPE,
  releaseMessage,
} from "../pushMessages.js";
import { NEWS } from "../../../../data/news.js";

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

describe("releaseMessage", () => {
  const entry = {
    version: "9.9.0",
    tag: "Nouveauté",
    title: "Truc",
    items: ["Premier point."],
  };

  it("annonce une nouveauté, lien vers /nouveautes", () => {
    const msg = releaseMessage(entry);
    expect(msg.title).toBe("Nouveau sur ZIK : Truc");
    expect(msg.body).toBe("Premier point.");
    expect(msg.url).toBe("/nouveautes");
  });

  it("préfère le résumé et coupe un texte trop long", () => {
    expect(releaseMessage({ ...entry, summary: "Résumé" }).body).toBe("Résumé");
    const long = releaseMessage({ ...entry, items: ["x".repeat(300)] }).body;
    expect(long.length).toBe(140);
    expect(long.endsWith("…")).toBe(true);
  });

  it("aucune annonce pour un correctif", () => {
    expect(releaseMessage({ ...entry, tag: "Correctif" })).toBeNull();
  });

  it("la dernière entrée de /nouveautes donne une annonce valide", () => {
    const msg = releaseMessage(NEWS[0]);
    if (NEWS[0].tag === "Correctif") return expect(msg).toBeNull();
    expect(msg.body.length).toBeGreaterThan(0);
    expect(msg.body.length).toBeLessThanOrEqual(140);
  });
});
