import { describe, it, expect } from "vitest";
import { pickCardWinner } from "../cards.js";

const NOW = new Date("2026-10-05T20:00:00Z").getTime();
const OLD = "2026-01-01T00:00:00Z";

function player(userId, ip, extra = {}) {
  return {
    userId,
    verified: true,
    createdAt: OLD,
    ip,
    lastAnswerRound: 6,
    disconnected: false,
    guesses: 3,
    ...extra,
  };
}

function setup(overrides = {}) {
  return {
    card: { id: "c1", rarity: "common" },
    finders: [{ name: "ana", ms: 4_000 }],
    players: {
      ana: player("u-ana", "ip-a"),
      bob: player("u-bob", "ip-b"),
      cyd: player("u-cyd", "ip-c"),
      dan: player("u-dan", "ip-d"),
    },
    round: 6,
    maxRounds: 10,
    playlistSize: 150,
    mode: "classic",
    skipped: false,
    ownerIds: new Set(),
    trackAddedAt: OLD,
    now: NOW,
    ...overrides,
  };
}

describe("pickCardWinner", () => {
  it("donne la carte au premier joueur qui a tout trouvé", () => {
    expect(pickCardWinner(setup()).winner).toBe("ana");
  });

  it("laisse la carte au suivant quand le premier l'a déjà", () => {
    const res = pickCardWinner(
      setup({
        finders: [
          { name: "ana", ms: 3_000 },
          { name: "bob", ms: 5_000 },
        ],
        players: {
          ana: player("u-ana", "ip-a", { owns: true }),
          bob: player("u-bob", "ip-b"),
          cyd: player("u-cyd", "ip-c"),
        },
      }),
    );
    expect(res.winner).toBe("bob");
    expect(res.owned).toEqual(["ana"]);
  });

  it("ne la donne au suivant que s'il remplit les conditions", () => {
    const res = pickCardWinner(
      setup({
        card: { id: "c1", rarity: "epic" },
        finders: [
          { name: "ana", ms: 3_000 },
          { name: "bob", ms: 20_000 },
        ],
        players: {
          ana: player("u-ana", "ip-a", { owns: true }),
          bob: player("u-bob", "ip-b"),
          cyd: player("u-cyd", "ip-c"),
        },
      }),
    );
    expect(res.winner).toBeNull();
    expect(res.refusals[0]).toMatchObject({ name: "bob", reason: "speed" });
  });

  it("ne donne rien quand le titre n'a pas de carte", () => {
    expect(pickCardWinner(setup({ card: null })).winner).toBeNull();
  });

  it("ne bloque jamais un joueur très rapide et honnête", () => {
    const res = pickCardWinner(
      setup({
        card: { id: "c1", rarity: "mythic" },
        finders: [{ name: "ana", ms: 900 }],
        players: {
          ana: player("u-ana", "ip-a", { guesses: 60 }),
          bob: player("u-bob", "ip-b"),
          cyd: player("u-cyd", "ip-c"),
          dan: player("u-dan", "ip-d"),
        },
      }),
    );
    expect(res.winner).toBe("ana");
    expect(res.signals.map((s) => s.reason).sort()).toEqual([
      "many_guesses",
      "very_fast",
    ]);
  });

  it("refuse en solo", () => {
    const res = pickCardWinner(
      setup({ players: { ana: player("u-ana", "ip-a") } }),
    );
    expect(res.winner).toBeNull();
    expect(res.refusals[0]).toMatchObject({ name: "ana", reason: "players" });
  });

  it("compte pour un seul joueur plusieurs comptes derrière la même IP", () => {
    const res = pickCardWinner(
      setup({
        players: {
          ana: player("u-ana", "ip-a"),
          alt: player("u-alt", "ip-a"),
        },
      }),
    );
    expect(res.winner).toBeNull();
  });

  it("ne compte pas les comptes qui ne jouent pas ou sont déconnectés", () => {
    const res = pickCardWinner(
      setup({
        players: {
          ana: player("u-ana", "ip-a"),
          afk: player("u-afk", "ip-b", { lastAnswerRound: 2 }),
          gone: player("u-gone", "ip-c", { disconnected: true }),
        },
      }),
    );
    expect(res.winner).toBeNull();
  });

  it("passe la carte au joueur suivant quand le premier est un invité", () => {
    const res = pickCardWinner(
      setup({
        finders: [
          { name: "guest", ms: 3_000 },
          { name: "bob", ms: 5_000 },
        ],
        players: {
          guest: player(null, "ip-g", { verified: false }),
          bob: player("u-bob", "ip-b"),
          cyd: player("u-cyd", "ip-c"),
        },
      }),
    );
    expect(res.winner).toBe("bob");
    expect(res.guest).toBe("guest");
  });

  it("refuse une haute rareté trouvée trop lentement", () => {
    const res = pickCardWinner(
      setup({
        card: { id: "c1", rarity: "mythic" },
        finders: [{ name: "ana", ms: 8_200 }],
      }),
    );
    expect(res.winner).toBeNull();
    expect(res.refusals[0]).toMatchObject({
      name: "ana",
      reason: "speed",
      limitMs: 6_000,
    });
  });

  it("applique les temps du QCM en mode QCM", () => {
    const base = { card: { id: "c1", rarity: "legendary" }, mode: "qcm" };
    expect(
      pickCardWinner(setup({ ...base, finders: [{ name: "ana", ms: 3_500 }] }))
        .winner,
    ).toBe("ana");
    expect(
      pickCardWinner(setup({ ...base, finders: [{ name: "ana", ms: 4_500 }] }))
        .winner,
    ).toBeNull();
  });

  it("exige deux autres comptes sur sa propre playlist, et jamais de Mythique", () => {
    const own = { ownerIds: new Set(["u-ana"]) };
    expect(
      pickCardWinner(
        setup({
          ...own,
          players: {
            ana: player("u-ana", "ip-a"),
            bob: player("u-bob", "ip-b"),
          },
        }),
      ).winner,
    ).toBeNull();
    expect(pickCardWinner(setup(own)).winner).toBe("ana");
    expect(
      pickCardWinner(
        setup({
          ...own,
          card: { id: "c1", rarity: "mythic" },
          finders: [{ name: "ana", ms: 2_000 }],
        }),
      ).winner,
    ).toBeNull();
  });

  it("ne donne rien sur une partie trop courte, une petite playlist, une manche sautée ou un titre ajouté à l'instant", () => {
    expect(pickCardWinner(setup({ maxRounds: 3 })).winner).toBeNull();
    expect(pickCardWinner(setup({ playlistSize: 99 })).winner).toBeNull();
    expect(pickCardWinner(setup({ skipped: true })).winner).toBeNull();
    expect(
      pickCardWinner(
        setup({ trackAddedAt: new Date(NOW - 60 * 60 * 1000).toISOString() }),
      ).winner,
    ).toBeNull();
  });

  it("donne la carte à un compte neuf mais la met en attente", () => {
    const res = pickCardWinner(
      setup({
        players: {
          ana: player("u-ana", "ip-a", {
            createdAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
          }),
          bob: player("u-bob", "ip-b"),
        },
      }),
    );
    expect(res.winner).toBe("ana");
    expect(res.delayed).toBe(true);
  });
});
