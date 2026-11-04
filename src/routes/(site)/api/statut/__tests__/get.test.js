import { describe, it, expect, vi } from "vitest";

vi.mock("$lib/server/config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));

const { GET } = await import("../+server.js");

describe("/api/statut", () => {
  it("jamais en cache, et rien d'autre que le niveau", async () => {
    const res = GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(Object.keys(await res.json())).toEqual(["level"]);
  });
});
