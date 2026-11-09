import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeSupabase, arg, eqOf } from "./fakeSupabase.js";

const m = vi.hoisted(() => ({
  sb: null,
  notifs: [],
  seen: new Set(),
}));

vi.mock("../../../config.js", () => ({ getAdminClient: () => m.sb }));
vi.mock("../../notify/notifications.js", () => ({
  createNotification: async (n) => m.notifs.push(n),
}));
vi.mock("../../notify/push.js", () => ({
  firstTime: async (key) => !m.seen.has(key) && !!m.seen.add(key),
}));

const { notifySetsNearlyDone } = await import("../hunt.js");

// Monde simulé : sets, cartes de chaque set, cartes possédées, titres, rooms
let world;
function db() {
  return fakeSupabase((q) => {
    switch (q.table) {
      case "card_set_items": {
        if (arg(q, "in")) {
          const ids = arg(q, "in")[1];
          const min = arg(q, "gte")[1];
          return {
            data: world.sets
              .filter((s) => s.card_count >= min)
              .filter((s) => s.cards.some((c) => ids.includes(c)))
              .map((s) => ({ set_id: s.id, card_sets: s })),
          };
        }
        const set = world.sets.find((s) => s.id === eqOf(q, "set_id"));
        return { data: set.cards.map((card_id) => ({ card_id })) };
      }
      case "user_cards": {
        const ids = arg(q, "in")[1];
        return {
          data: world.owned
            .filter((c) => ids.includes(c))
            .map((card_id) => ({ card_id })),
        };
      }
      case "tracks":
        return {
          data: world.tracks
            .filter((t) => t.card === eqOf(q, "card_id"))
            .map((t) => ({ id: t.id })),
        };
      case "custom_playlist_tracks":
        return {
          data: world.tracks
            .filter((t) => t.playlist && arg(q, "in")[1].includes(t.id))
            .map((t) => ({ playlist_id: t.playlist })),
        };
      case "room_playlists":
        return { data: world.links };
      case "rooms":
        world.roomFilter = arg(q, "or")[0];
        world.publicOnly = eqOf(q, "is_public");
        return { data: world.rooms };
    }
  });
}

const set = (id, cards, extra = {}) => ({
  id,
  kind: "artist",
  name: `Set ${id}`,
  card_count: cards.length,
  cover_url: `cover-${id}`,
  cards,
  ...extra,
});

beforeEach(() => {
  m.notifs = [];
  m.seen = new Set();
  world = {
    sets: [set("s1", ["a", "b", "c"])],
    owned: ["a", "b"],
    tracks: [{ id: 1, card: "c", playlist: 9 }],
    links: [{ room_id: "r1" }],
    rooms: [{ code: "ROOM1", name: "Années 80", game_mode: "qcm" }],
  };
  m.sb = db();
});

describe("notifySetsNearlyDone", () => {
  it("aucune carte gagnée : aucune requête", async () => {
    await notifySetsNearlyDone("u1", []);
    expect(m.sb.calls).toEqual([]);
  });

  it("il manque une carte : notification avec la room où elle passe", async () => {
    await notifySetsNearlyDone("u1", ["b"]);
    expect(m.notifs).toEqual([
      {
        userId: "u1",
        type: "card_set_near",
        actorId: null,
        payload: {
          setId: "s1",
          kind: "artist",
          setName: "Set s1",
          cover: "cover-s1",
          // Voulu : le jeu rejoint une room par son code (/game?roomId=<code>)
          roomId: "ROOM1",
          roomCode: "ROOM1",
          roomName: "Années 80",
          gameMode: "qcm",
        },
      },
    ]);
    expect(world.roomFilter).toBe("playlist_id.in.(9),id.in.(r1)");
    expect(world.publicOnly).toBe(true);
  });

  it("ne donne jamais l'id, le titre ni l'artiste de la carte manquante", async () => {
    await notifySetsNearlyDone("u1", ["b"]);
    const text = JSON.stringify(m.notifs[0].payload);
    expect(text).not.toContain('"c"');
    expect(m.notifs[0].payload).not.toHaveProperty("cardId");
    expect(m.notifs[0].payload).not.toHaveProperty("title");
  });

  it("une seule fois par set et par joueur", async () => {
    await notifySetsNearlyDone("u1", ["b"]);
    await notifySetsNearlyDone("u1", ["b"]);
    expect(m.notifs).toHaveLength(1);
    await notifySetsNearlyDone("u2", ["b"]);
    expect(m.notifs).toHaveLength(2);
  });

  it("il en manque deux, ou aucune : pas de notification", async () => {
    world.owned = ["a"];
    await notifySetsNearlyDone("u1", ["a"]);
    world.owned = ["a", "b", "c"];
    await notifySetsNearlyDone("u1", ["c"]);
    expect(m.notifs).toEqual([]);
  });

  it("set de moins de 3 cartes : ignoré", async () => {
    world.sets = [set("s2", ["a", "b"])];
    world.owned = ["a"];
    await notifySetsNearlyDone("u1", ["a"]);
    expect(m.notifs).toEqual([]);
  });

  it("plusieurs cartes du même set : un seul passage", async () => {
    world.sets = [set("s1", ["a", "b", "c", "d"])];
    world.owned = ["a", "b", "d"];
    await notifySetsNearlyDone("u1", ["a", "b", "d"]);
    expect(m.notifs).toHaveLength(1);
  });

  it("carte absente de toute playlist : notification sans room, mode classique", async () => {
    world.tracks = [];
    await notifySetsNearlyDone("u1", ["b"]);
    expect(m.notifs[0].payload).toMatchObject({
      roomId: null,
      roomCode: null,
      roomName: null,
      gameMode: "classic",
    });
  });

  it("aucune room publique liée : cherche par playlist seule, sinon sans room", async () => {
    world.links = [];
    world.rooms = [];
    await notifySetsNearlyDone("u1", ["b"]);
    expect(world.roomFilter).toBe("playlist_id.in.(9)");
    expect(m.notifs[0].payload.roomCode).toBeNull();
  });

  it("liens et rooms renvoyés nuls par la base : pas de plantage", async () => {
    world.links = null;
    world.rooms = null;
    await notifySetsNearlyDone("u1", ["b"]);
    expect(m.notifs[0].payload.gameMode).toBe("classic");
  });

  it("titre dans aucune playlist : pas de recherche de room", async () => {
    world.tracks = [{ id: 1, card: "c", playlist: null }];
    world.roomFilter = "jamais";
    await notifySetsNearlyDone("u1", ["b"]);
    expect(world.roomFilter).toBe("jamais");
    expect(m.notifs[0].payload.roomCode).toBeNull();
  });
});
