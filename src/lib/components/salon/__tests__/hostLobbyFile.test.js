import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import HostLobby from "../host/HostLobby.svelte";

const lobby = (waiting) =>
  render(HostLobby, {
    props: {
      h: {
        code: "KZ4P2M",
        players: [{ username: "Ana" }],
        teams: null,
        controls: 1,
        mediaCheck: null,
        waiting,
      },
    },
  }).body;

describe("TV : la file à l'entrée", () => {
  it("« 3 en attente » à côté du compteur, sans prix ni ZIK Pro", () => {
    const html = lobby(3);
    expect(html).toContain("<em>3 en attente</em>");
    expect(html).not.toMatch(/€|Pro|complet/i);
  });

  it("personne en file : rien", () => {
    expect(lobby(0)).not.toContain("en attente");
  });
});
