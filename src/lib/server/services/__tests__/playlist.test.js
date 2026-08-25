import { describe, it, expect } from "vitest";
import { buildTrack, buildTrackFromRow } from "../playlist.js";

describe("buildTrack — identifiants du catalogue", () => {
  it("conserve id et external_id", () => {
    const t = buildTrack({
      artist: "PLK",
      title: "Pas de son",
      id: "uuid-1",
      external_id: "dz-42",
    });
    expect(t.id).toBe("uuid-1");
    expect(t.external_id).toBe("dz-42");
  });

  it("laisse les identifiants indéfinis quand ils ne sont pas fournis", () => {
    const t = buildTrack({ artist: "PLK", title: "Pas de son" });
    expect(t.id).toBeUndefined();
    expect(t.external_id).toBeUndefined();
  });

  it("n'altère pas les champs de jeu existants", () => {
    const t = buildTrack({
      artist: "Gazo feat. Tiakola",
      title: "Mopa",
      id: "uuid-2",
    });
    expect(t.mainArtist).toBe("Gazo");
    expect(t.featArtists).toEqual(["Tiakola"]);
    expect(t.title).toBe("Mopa");
  });
});

describe("buildTrackFromRow", () => {
  const row = {
    custom_artist: null,
    custom_title: null,
    custom_feats: null,
    track_answers: [],
    tracks: {
      id: "uuid-3",
      artist: "Ninho",
      title: "Vérité",
      cover_url: "http://x/c.jpg",
      preview_url: "http://x/p.mp3",
      external_id: "dz-77",
    },
  };

  it("reprend les identifiants du catalogue joint", () => {
    const t = buildTrackFromRow(row);
    expect(t.id).toBe("uuid-3");
    expect(t.external_id).toBe("dz-77");
  });

  it("laisse custom_artist primer sans perdre l'identifiant", () => {
    const t = buildTrackFromRow({ ...row, custom_artist: "Ninho & Niska" });
    expect(t.artist).toBe("Ninho & Niska");
    expect(t.id).toBe("uuid-3");
  });
});
