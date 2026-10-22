import { describe, it, expect } from "vitest";
import { dicebear } from "../utils.js";

describe("utils", () => {
  it("dicebear retourne une URL avec le seed encodé", () => {
    const url = dicebear("Alice");
    expect(url).toContain("Alice");
    expect(url).toMatch(/^https:\/\/api\.dicebear\.com/);
  });
});
