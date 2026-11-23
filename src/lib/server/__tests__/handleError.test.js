import { describe, it, expect, vi, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("../config.js", () => ({ supabase: {}, getAdminClient: () => ({}) }));
vi.mock("$app/environment", () => ({ version: "test" }));

const { handleError } = await import("../../../hooks.server.js");

const event = {
  request: { method: "GET" },
  url: new URL("http://localhost/nexiste-pas"),
};

describe("handleError (kit 3 : { kind, error, event })", () => {
  afterEach(() => vi.restoreAllMocks());

  it("ignore les 404 des robots et les error(4xx) de l'application", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    handleError({
      kind: "framework",
      error: { status: 404, message: "Not Found" },
      event,
    });
    handleError({ kind: "app", error: { message: "Interdit" }, event });
    expect(log).not.toHaveBeenCalled();
  });

  it("journalise une exception du code", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("boom");
    handleError({ kind: "unknown", error: boom, event });
    expect(log).toHaveBeenCalledWith("[500] GET /nexiste-pas\n", boom);
  });
});

// $app/stores est un bouchon en kit 3 : il lève à la lecture, le build ne le voit pas
it("aucun fichier de src n'importe $app/stores", () => {
  const files = readdirSync("src", { recursive: true })
    .filter((f) => /\.(svelte|js)$/.test(f) && !f.includes("__tests__"))
    .filter((f) =>
      readFileSync(join("src", f), "utf8").includes("$app/stores"),
    );
  expect(files).toEqual([]);
});
