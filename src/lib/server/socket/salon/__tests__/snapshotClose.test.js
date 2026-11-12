import { describe, it, expect, beforeEach, vi } from "vitest";

// Base simulée : une sauvegarde n'écrit qu'au moment où on la libère
const base = new Map();
const enVol = [];
let lenteurs = 0;
let effacementLent = false;
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    schema: () => ({
      rpc: async (fn, a) => {
        if (fn === "save_salon_snapshot") {
          if (lenteurs > 0) {
            lenteurs--;
            await new Promise((r) => enVol.push(r));
          }
          base.set(a.p_code, a.p_data);
        } else if (fn === "delete_salon_snapshot") {
          if (effacementLent) await new Promise((r) => enVol.push(r));
          base.delete(a.p_code);
        } else if (fn === "load_salon_snapshot") {
          const data = base.get(a.p_code);
          return { data: data ? [{ data }] : [], error: null };
        }
        return { data: null, error: null };
      },
    }),
  }),
}));

const { salonRooms } = await import("../../../state.js");
const { saveSnapshot, dropSnapshot, restoreSalon, freezeAndSaveAll } =
  await import("../snapshot.js");
const { salonEnManche, nettoie } = await import("./snapshotHarness.js");

const io = {
  to: () => ({ emit: () => {} }),
  sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
};
const libere = () => enVol.splice(0).forEach((r) => r());

beforeEach(() => {
  base.clear();
  enVol.length = 0;
  lenteurs = 0;
  effacementLent = false;
  for (const k of Object.keys(salonRooms)) delete salonRooms[k];
});

describe("fermeture d'un salon pendant une sauvegarde", () => {
  it("une sauvegarde encore en vol ne fait pas renaître le salon fermé", async () => {
    const salon = salonEnManche();
    lenteurs = 2;
    const save = saveSnapshot(salon);
    const drop = dropSnapshot(salon.code, salon);
    // Un téléphone revient avec le code pendant l'effacement
    const reprise = restoreSalon(salon.code, io, {});
    await new Promise((r) => setTimeout(r, 0));
    libere();
    await Promise.all([save, drop, reprise]);
    expect(base.size).toBe(0);
    expect(salonRooms[salon.code]).toBeUndefined();
    nettoie(salon);
  });

  it("un téléphone qui revient pendant l'effacement ne relit pas l'instantané", async () => {
    const salon = salonEnManche();
    await saveSnapshot(salon);
    effacementLent = true;
    const drop = dropSnapshot(salon.code, salon);
    const reprise = restoreSalon(salon.code, io, {});
    await new Promise((r) => setTimeout(r, 0));
    libere();
    await Promise.all([drop, reprise]);
    expect(salonRooms[salon.code]).toBeUndefined();
    nettoie(salon);
  });

  it("aucune sauvegarde ne part après la fermeture", async () => {
    const salon = salonEnManche();
    await dropSnapshot(salon.code, salon);
    expect(await saveSnapshot(salon)).toBeNull();
    expect(base.size).toBe(0);
    nettoie(salon);
  });

  it("un nouveau salon sur le même code se sauvegarde et se reprend", async () => {
    const ancien = salonEnManche();
    await dropSnapshot(ancien.code, ancien);
    nettoie(ancien);
    const salon = salonEnManche();
    await saveSnapshot(salon);
    nettoie(salon);
    await restoreSalon(salon.code, io, {});
    expect(salonRooms[salon.code]?.code).toBe(salon.code);
    nettoie(salonRooms[salon.code]);
  });

  // En dernier : après le SIGTERM, plus aucune sauvegarde ne part
  it("le SIGTERM attend la fin des effacements en cours", async () => {
    const salon = salonEnManche();
    await saveSnapshot(salon);
    effacementLent = true;
    dropSnapshot(salon.code, salon);
    let fini = false;
    const arret = freezeAndSaveAll().then(() => (fini = true));
    await new Promise((r) => setTimeout(r, 0));
    expect(fini).toBe(false);
    libere();
    await arret;
    expect(base.size).toBe(0);
    nettoie(salon);
  });
});
