import { describe, it, expect, vi } from "vitest";
import { render } from "svelte/server";
import { authRedirect } from "../redirect.js";

vi.mock("$env/dynamic/public", () => ({ env: {} }));
const { default: AuthModal } = await import("../AuthModal.svelte");

const O = "https://www.zik-music.fr";

describe("retour après connexion", () => {
  it("revient sur la page demandée", () => {
    expect(authRedirect(O, "/pro")).toBe(O + "/pro");
    expect(authRedirect(O, "/pro?x=1")).toBe(O + "/pro?x=1");
  });

  it("sans page demandée : l'accueil, comme avant", () => {
    expect(authRedirect(O, undefined)).toBe(O);
    expect(authRedirect(O, "")).toBe(O);
  });

  it("jamais un autre domaine", () => {
    for (const next of [
      "//evil.fr",
      "/\\evil.fr",
      "https://evil.fr",
      "evil.fr",
      "javascript:alert(1)",
      42,
      {},
    ])
      expect(authRedirect(O, next), String(next)).toBe(O);
  });
});

describe("fenêtre de connexion", () => {
  const modal = (props) =>
    render(AuthModal, {
      props: { sb: null, open: true, view: "register", onClose() {}, ...props },
    }).body;

  it("rappelle la suite quand une page la donne", () => {
    const body = modal({ note: "Soirée 24 h · 7,90 € pour la soirée KZ4P2M" });
    expect(body).toContain("Ensuite");
    expect(body).toContain("pour la soirée KZ4P2M");
  });

  it("sans note : rien de plus", () => {
    expect(modal({})).not.toContain("gl-note");
  });
});
