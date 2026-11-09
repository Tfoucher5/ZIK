import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeSupabase } from "../../__tests__/fakeSupabase.js";

const m = vi.hoisted(() => ({ db: null }));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));

const { roomGames } = await import("../../../state.js");
const {
  onlineCount,
  totalOnline,
  roomPlaylists,
  coversByPlaylist,
  withCovers,
} = await import("../roomList.js");

beforeEach(() => {
  for (const k of Object.keys(roomGames)) delete roomGames[k];
  m.db = fakeSupabase();
});

describe("joueurs en ligne", () => {
  beforeEach(() => {
    roomGames.g1 = {
      roomId: "ROCK",
      players: {
        a: { verified: true },
        b: {},
        c: { _dcTimer: 1, verified: true },
      },
    };
    roomGames.g2 = { roomId: "ROCK", players: { d: { verified: true } } };
    roomGames.g3 = { roomId: "POP", players: { e: {} } };
  });

  it("compte une room, sans les déconnectés en sursis", () => {
    expect(onlineCount("ROCK")).toBe(3);
    expect(onlineCount("ROCK", { verifiedOnly: true })).toBe(2);
    expect(onlineCount("JAZZ")).toBe(0);
  });

  it("total de toutes les rooms", () => {
    expect(totalOnline()).toBe(4);
  });
});

describe("playlists d'une room", () => {
  it("liens triés par position, playlists absentes ignorées", () => {
    const r = roomPlaylists({
      playlist_id: 99,
      custom_playlists: { id: 99, track_count: 1000 },
      room_playlists: [
        {
          playlist_id: 2,
          position: 2,
          custom_playlists: { id: 2, track_count: 30 },
        },
        {
          playlist_id: 1,
          position: 1,
          custom_playlists: { id: 1, track_count: 20 },
        },
        { playlist_id: 3, position: 3, custom_playlists: null },
      ],
    });
    expect(r.playlist_ids).toEqual([1, 2, 3]);
    expect(r.playlists.map((p) => p.id)).toEqual([1, 2]);
    expect(r.track_count).toBe(50);
  });

  it("sans lien : ancienne playlist_id", () => {
    expect(
      roomPlaylists({
        playlist_id: 9,
        custom_playlists: { id: 9, track_count: 12 },
      }),
    ).toEqual({
      playlists: [{ id: 9, track_count: 12 }],
      playlist_ids: [9],
      track_count: 12,
    });
  });

  it("room sans playlist : vide", () => {
    expect(roomPlaylists({ room_playlists: [] })).toEqual({
      playlists: [],
      playlist_ids: [],
      track_count: 0,
    });
  });
});

describe("pochettes", () => {
  it("aucune playlist : aucune requête", async () => {
    expect(await coversByPlaylist([], 9)).toEqual({});
    expect(m.db.client.rpc).not.toHaveBeenCalled();
  });

  it("ids dédoublonnés, réponse vide si la base échoue", async () => {
    expect(await coversByPlaylist([1, 1, 2], 4)).toEqual({});
    expect(m.db.client.rpc).toHaveBeenCalledWith("get_covers_by_playlists", {
      pids: [1, 2],
      max_per_playlist: 4,
    });
  });

  it("par room : mélange stable, sans doublon, borné", async () => {
    m.db.client.rpc.mockResolvedValue({
      data: { 1: ["a", "b", "c"], 2: ["c", "d", "e"] },
      error: null,
    });
    const rooms = [
      { id: "ROCK", playlist_ids: [1, 2] },
      { id: "VIDE", playlist_ids: [7] },
    ];
    const [rock, vide] = await withCovers(rooms, 4);
    expect(rock.covers).toHaveLength(4);
    expect(new Set(rock.covers).size).toBe(4);
    expect(vide.covers).toEqual([]);
    const [again] = await withCovers(rooms, 4);
    expect(again.covers).toEqual(rock.covers);
  });
});
