import { describe, it, expect, vi } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";

vi.mock("../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));

describe("arborescence des routes admin", () => {
  const ROUTES = path.resolve("src/routes");
  const fichiers = readdirSync(ROUTES, { recursive: true, withFileTypes: true })
    .filter((f) => f.isFile() && f.name.startsWith("+"))
    .map((f) => path.relative(ROUTES, path.join(f.parentPath, f.name)))
    .map((f) => f.split(path.sep));
  const urlDe = (segments) =>
    "/" +
    segments
      .slice(0, -1)
      .filter((s) => !/^\(.*\)$/.test(s))
      .join("/");
  const groupeAdmin = fichiers.filter((s) => s[0] === "(admin)");

  it("toute URL /admin reste dans le groupe (admin)", () => {
    const urlsAdmin = fichiers.filter((s) => /^\/admin(\/|$)/.test(urlDe(s)));
    expect(urlsAdmin.length).toBeGreaterThan(10);
    expect(urlsAdmin.filter((s) => s[0] !== "(admin)")).toEqual([]);
  });

  it("tout load et toute action du groupe refusent sans admin", async () => {
    const pages = groupeAdmin.filter((f) => f.at(-1) === "+page.server.js");
    expect(pages.length).toBeGreaterThan(10);
    for (const s of pages) {
      const module = await import(/* @vite-ignore */ path.join(ROUTES, ...s));
      const appels = [
        ["load", module.load],
        ...Object.entries(module.actions ?? {}),
      ];
      expect(module.load, s.join("/")).toBeTypeOf("function");
      for (const [nom, appel] of appels) {
        await expect(
          (async () => appel({ locals: {} }))(),
          `${s.join("/")} ${nom}`,
        ).rejects.toMatchObject({ status: 403 });
      }
    }
  });

  it("tout handler +server.js du groupe refuse sans admin", async () => {
    const serveurs = groupeAdmin.filter((f) => f.at(-1) === "+server.js");
    expect(serveurs.length).toBeGreaterThan(0);
    for (const s of serveurs) {
      const module = await import(/* @vite-ignore */ path.join(ROUTES, ...s));
      const handlers = Object.entries(module).filter(([nom]) =>
        /^[A-Z]+$/.test(nom),
      );
      expect(handlers.length, s.join("/")).toBeGreaterThan(0);
      for (const [nom, handler] of handlers) {
        const event = {
          locals: {},
          url: new URL("https://zik.test/"),
          request: new Request("https://zik.test/", {
            method: "POST",
            body: "{}",
          }),
        };
        await expect(
          (async () => handler(event))(),
          `${s.join("/")} ${nom}`,
        ).rejects.toMatchObject({ status: 403 });
      }
    }
  });
});
