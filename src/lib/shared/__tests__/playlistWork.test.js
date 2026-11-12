import { describe, it, expect } from "vitest";
import { guessWork, workFromAlbum, workFromArtist } from "../playlist/work.js";

describe("workFromAlbum", () => {
  it.each([
    [
      "La Reine des Neiges (Bande Originale Française du Film)",
      "La Reine des Neiges",
    ],
    [
      "La Reine des Neiges 2 (Bande Originale Française du Film/Deluxe Edition)",
      "La Reine des Neiges 2",
    ],
    [
      "Le retour de Mary Poppins (Bande Originale Française du Film)",
      "Le retour de Mary Poppins",
    ],
    ["The Aristocats Original Soundtrack", "The Aristocats"],
    ["Bambi Original Soundtrack (French Version)", "Bambi"],
    ["Tarzan Original Soundtrack", "Tarzan"],
  ])("%s → %s", (album, film) => expect(workFromAlbum(album)).toBe(film));

  it("album qui n'est pas une bande originale : rien", () => {
    expect(
      workFromAlbum("Le Roi Lion (Deluxe Collection - Lion King)"),
    ).toBeNull();
    expect(workFromAlbum("The Best Of Disneyland Resort Paris")).toBeNull();
    expect(workFromAlbum("Boston")).toBeNull();
    expect(workFromAlbum(null)).toBeNull();
  });
});

describe("workFromArtist", () => {
  it.each([
    ["Cast - Aristocats", "Aristocats"],
    ["Chœurs - Alice au Pays des Merveilles", "Alice au Pays des Merveilles"],
    ["Cast of Bambi", "Bambi"],
    ["Cast - The Jungle Book", "The Jungle Book"],
  ])("%s → %s", (artist, film) => expect(workFromArtist(artist)).toBe(film));

  it("un vrai nom d'artiste : rien", () => {
    expect(workFromArtist("Phil Collins")).toBeNull();
    expect(workFromArtist("Castelo")).toBeNull();
    expect(workFromArtist(undefined)).toBeNull();
  });
});

describe("guessWork", () => {
  it("le film déjà saisi pour la même chanson passe avant tout", () => {
    expect(
      guessWork({
        known: "Le Bossu de Notre-Dame",
        album: "The Hunchback Of Notre Dame Original Soundtrack",
        artist: "Cast - Hunchback",
      }),
    ).toBe("Le Bossu de Notre-Dame");
  });
  it("une bande originale française passe avant le nom de la troupe", () => {
    expect(
      guessWork({
        album: "La Reine des Neiges (Bande Originale Française du Film)",
        artist: "Cast of Frozen",
      }),
    ).toBe("La Reine des Neiges");
  });
  it("le nom de la troupe passe avant un album en anglais", () => {
    expect(
      guessWork({
        album: "The Aristocats Original Soundtrack",
        artist: "Cast - Aristocats",
      }),
    ).toBe("Aristocats");
  });
  it("rien de reconnaissable : null", () => {
    expect(
      guessWork({ album: "Thriller", artist: "Michael Jackson" }),
    ).toBeNull();
  });
});
