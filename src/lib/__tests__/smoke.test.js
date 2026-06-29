import { describe, it, expect } from "vitest";
import { esc, dicebear } from "../utils.js";

describe("utils", () => {
  it("esc échappe les caractères HTML", () => {
    expect(esc("<b>test</b>")).toBe("&lt;b&gt;test&lt;/b&gt;");
    expect(esc('"quoted"')).toBe("&quot;quoted&quot;");
    expect(esc("a & b")).toBe("a &amp; b");
  });

  it("dicebear retourne une URL avec le seed encodé", () => {
    const url = dicebear("Alice");
    expect(url).toContain("Alice");
    expect(url).toMatch(/^https:\/\/api\.dicebear\.com/);
  });
});
