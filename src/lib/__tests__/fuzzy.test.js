import { describe, it, expect } from "vitest";
import { fuzzyFilter } from "../fuzzy.js";

const items = [
  { artist: "Tiakola", title: "Meuda" },
  { artist: "Angèle", title: "Balance ton quoi" },
  { artist: "Stromae", title: "Alors on danse" },
];
const artists = (q) =>
  fuzzyFilter(items, q, ["artist", "title"]).map((t) => t.artist);

describe("fuzzyFilter", () => {
  it("renvoie la liste entière sans recherche", () => {
    expect(fuzzyFilter(items, "  ", ["artist"])).toBe(items);
  });
  it("tolère accents, fautes et ordre des mots", () => {
    expect(artists("angele")).toEqual(["Angèle"]);
    expect(artists("balanse")).toEqual(["Angèle"]);
    expect(artists("danse alors")).toEqual(["Stromae"]);
  });
  it("trouve encore un bout de mot", () => {
    expect(artists("kola")).toEqual(["Tiakola"]);
  });
  it("ne renvoie rien sans correspondance", () => {
    expect(artists("zzz")).toEqual([]);
  });
});
