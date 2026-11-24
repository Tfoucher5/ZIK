import { it, expect, vi } from "vitest";

// Règle 6 de zik-socket : le champ mediaCheck.dead, dont dépend le vrai
// total, survit à l'instantané (redémarrage du serveur en pleine soirée)
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({ schema: () => ({ rpc: async () => ({}) }) }),
}));

const { roundsTotal } = await import("../session.js");
const { salonEnManche, nettoie, revive } = await import("./snapshotHarness.js");

it("introuvables de la vérification : même total avant et après redémarrage", () => {
  const salon = salonEnManche();
  const g = salon.game;
  g.fullPlaylist = g.fullPlaylist.slice(0, 4);
  g.mediaCheck = {
    total: 2,
    video: 1,
    audio: 0,
    missing: 1,
    spares: 0,
    dead: [g.sessionPlaylist[0].id],
  };
  const avant = roundsTotal(salon);
  const revu = revive(salon);
  nettoie(salon);
  expect(revu.game.mediaCheck.dead).toEqual(g.mediaCheck.dead);
  expect(roundsTotal(revu)).toBe(avant);
  expect(avant).toBe(3);
});
