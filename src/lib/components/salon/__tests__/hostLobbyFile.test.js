import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import HostLobby from "../host/HostLobby.svelte";

const lobby = (waiting, controls = 1) =>
  render(HostLobby, {
    props: {
      h: {
        code: "KZ4P2M",
        players: [{ username: "Ana" }],
        teams: null,
        controls,
        mediaCheck: null,
        waiting,
      },
    },
  }).body;

describe("TV : la file à l'entrée", () => {
  it("« 3 en attente » à côté du compteur, sans prix ni ZIK Pro", () => {
    const html = lobby(3);
    expect(html).toContain("<em>3 en attente</em>");
    expect(html).not.toMatch(/€|ZIK Pro|complet/);
  });

  it("personne en file : rien", () => {
    expect(lobby(0)).not.toContain("en attente");
  });
});

// Fiche du 24/11 : sans régie, « Lancer la partie » est le seul magenta
describe("TV au lobby : un seul magenta", () => {
  const titre = (html) => html.match(/<em[^>]*>téléphones\.<\/em>/)?.[0] ?? "";
  it("sans régie : « téléphones. » sans accent", () => {
    expect(titre(lobby(0, 0))).toBe("<em>téléphones.</em>");
    expect(titre(lobby(0, null))).toBe("<em>téléphones.</em>");
  });
  it("avec une régie : « téléphones. » garde le magenta", () => {
    expect(titre(lobby(0, 1))).toMatch(/class="[^"]*accent/);
  });
});
