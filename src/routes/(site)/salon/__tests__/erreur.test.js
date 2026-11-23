import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "svelte/server";

const etat = vi.hoisted(() => ({ page: {} }));
vi.mock("$app/state", () => etat);
vi.mock("$app/environment", () => ({ version: "3.34.0" }));

const { default: Erreur } = await import("../+error.svelte");

const voir = (pathname, status) => {
  etat.page = {
    url: new URL(`https://zik${pathname}?code=k7m2qx`),
    status,
    error: { message: "boum" },
  };
  return render(Erreur).body;
};
const relance = (html) => html.includes('class="err-') === false;

beforeEach(() => {
  etat.page = {};
});

describe("+error.svelte du salon", () => {
  it.each(["/salon/host", "/salon/regie", "/salon/play"])(
    "4xx sur %s : page d'erreur du site",
    (p) => {
      expect(relance(voir(p, 404))).toBe(false);
      expect(relance(voir(p, 403))).toBe(false);
    },
  );

  it("5xx sur /salon/host : écran de relance", () => {
    const html = voir("/salon/host", 500);
    expect(relance(html)).toBe(true);
    expect((html.match(/role="status"/g) ?? []).length).toBe(1);
  });

  it("hors des écrans : page d'erreur du site", () => {
    expect(relance(voir("/salon/autre", 500))).toBe(false);
  });
});
