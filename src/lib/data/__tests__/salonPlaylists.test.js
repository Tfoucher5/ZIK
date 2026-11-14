import { describe, it, expect } from "vitest";
import {
  loadSalonPlaylists,
  DEFAULT_SALON_PLAYLIST,
} from "../salonPlaylists.js";

// Faux client Supabase : chaque requête chaînée se résout sur `result`
function fakeSb(result) {
  const q = {
    select: () => q,
    or: () => q,
    eq: () => q,
    neq: () => q,
    order: () => q,
    then: (ok, ko) => Promise.resolve(result).then(ok, ko),
  };
  return { schema: () => ({ from: () => q }) };
}

describe("playlists de la création de soirée", () => {
  it("une erreur de la base remonte au lieu d'une liste vide", async () => {
    await expect(
      loadSalonPlaylists(
        fakeSb({ data: null, error: { message: "réseau" } }),
        null,
      ),
    ).rejects.toEqual({ message: "réseau" });
  });

  it("pour un compte connecté, l'échec de « mes playlists » remonte aussi", async () => {
    const sb = fakeSb({ data: [], error: null });
    const mine = fakeSb({ data: null, error: { message: "mine" } });
    let n = 0;
    const both = { schema: () => (n++ === 0 ? sb : mine).schema() };
    await expect(loadSalonPlaylists(both, "u1")).rejects.toEqual({
      message: "mine",
    });
  });

  it("sans erreur, la playlist par défaut passe en tête des officielles", async () => {
    const data = [
      { id: "x", name: "X", track_count: 500, is_official: true },
      {
        id: DEFAULT_SALON_PLAYLIST,
        name: "D",
        track_count: 10,
        is_official: true,
      },
    ];
    const list = await loadSalonPlaylists(fakeSb({ data, error: null }), null);
    expect(list[0].id).toBe(DEFAULT_SALON_PLAYLIST);
  });
});
