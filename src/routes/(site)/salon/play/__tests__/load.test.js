import { describe, it, expect } from "vitest";
import { load } from "../+page.server.js";

describe("/salon/play : premier rendu", () => {
  it("rend le code du QR et le pseudo déjà envoyé", () => {
    const url = new URL("http://x/salon/play?code=abc123&pseudo=Julie");
    expect(load({ url }).join).toEqual({ code: "ABC123", pseudo: "Julie" });
  });
});
