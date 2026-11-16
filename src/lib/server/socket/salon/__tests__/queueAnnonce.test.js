import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  freezeAndSaveAll: async () => {},
  purgeSnapshots: async () => {},
  dropSnapshot: async () => {},
  restoreSalon: async () => {},
}));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("../../../services/admin/alerts.js", () => ({
  alertAdminsSafe: () => {},
}));

const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { kickPlayer } = await import("../players.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

const CTRL = `salon:ctrl:${CODE}`;
const TV = `salon:screens:${CODE}`;
let h;

function phone(id) {
  const s = makeSocket(id, h.rooms);
  s.recus = [];
  s.emit = (event, data) => s.recus.push({ event, data });
  s.de = (e) => s.recus.filter((r) => r.event === e).map((r) => r.data);
  h.io.sockets.sockets.set(id, s);
  h.connecte(s);
  return s;
}
async function arrive(id, username, extra = {}) {
  const s = phone(id);
  await s.handlers.salon_join_player({ code: CODE, username, ...extra });
  return s;
}
async function coupe(s) {
  h.io.sockets.sockets.delete(s.id);
  for (const r of s.propres) s.leave(r);
  await s.handlers.disconnect();
}
const annonces = () => h.emissions.filter((e) => e.event === "salon_queue");
const derniere = (cible) =>
  annonces().findLast((e) => e.cibles.includes(cible))?.payload;
const salon = () => salonRooms[CODE];

let joueurs;
beforeEach(async () => {
  for (const k of Object.keys(salonRooms)) delete salonRooms[k];
  salonDeTest();
  h = makeIo();
  registerSalon(h.io);
  joueurs = [];
  for (let i = 1; i <= 12; i++) joueurs.push(await arrive(`p${i}`, `J${i}`));
});

describe("la file se voit", () => {
  it("régie : nombre et 3 premiers pseudos ; TV : le nombre seul ; jamais ailleurs", async () => {
    expect(annonces()).toEqual([]);
    for (const [i, n] of ["Ana", "Bob", "Cy", "Dan"].entries())
      await arrive(`w${i}`, n, { wait: true });
    expect(derniere(CTRL)).toEqual({
      count: 4,
      names: ["Ana", "Bob", "Cy"],
    });
    expect(derniere(TV)).toEqual({ count: 4 });
    expect(annonces().flatMap((e) => e.cibles)).toEqual(
      Array.from({ length: 4 }, () => [CTRL, TV]).flat(),
    );
    for (const j of joueurs) expect(j.de("salon_queue")).toEqual([]);
  });

  it("régie et TV qui arrivent reçoivent l'état de la file", async () => {
    await arrive("w1", "Ana", { wait: true });
    h.emissions.length = 0;
    const regie = phone("ctrl");
    await regie.handlers.salon_join_control({ code: CODE, key: CLE });
    expect(derniere(CTRL)).toEqual({ count: 1, names: ["Ana"] });
    h.emissions.length = 0;
    const tv = phone("tv");
    await tv.handlers.salon_join_host({ code: CODE, key: CLE });
    expect(derniere(TV)).toEqual({ count: 1 });
  });

  it("coupé : ne compte plus, revient avec son jeton : recompté au même rang", async () => {
    const a = await arrive("w1", "Ana", { wait: true });
    await arrive("w2", "Bob", { wait: true });
    await coupe(a);
    expect(derniere(CTRL)).toEqual({ count: 1, names: ["Bob"] });
    const { token } = a.de("salon_waiting")[0];
    await arrive("w1b", "Ana", { wait: true, token });
    expect(derniere(CTRL)).toEqual({ count: 2, names: ["Ana", "Bob"] });
  });

  it("départ volontaire annoncé, hors file sans annonce", async () => {
    const a = await arrive("w1", "Ana", { wait: true });
    await a.handlers.salon_queue_leave();
    expect(derniere(TV)).toEqual({ count: 0 });
    const avant = annonces().length;
    await a.handlers.salon_queue_leave();
    await joueurs[0].handlers.salon_queue_leave();
    expect(annonces()).toHaveLength(avant);
  });

  it("admission : la file restante est annoncée", async () => {
    await arrive("w1", "Ana", { wait: true });
    await arrive("w2", "Bob", { wait: true });
    kickPlayer(salon(), "J1", h.io);
    expect(salon().players.Ana).toBeDefined();
    expect(derniere(CTRL)).toEqual({ count: 1, names: ["Bob"] });
  });

  it("pseudo d'un téléphone en file coupé : gardé même avec une place libre", async () => {
    const a = await arrive("w1", "Ana", { wait: true });
    const { token } = a.de("salon_waiting")[0];
    await coupe(a);
    delete salon().players.J1;
    const autre = await arrive("x1", "Ana");
    expect(autre.de("salon_error")).toEqual([
      { message: "Ce pseudo est déjà pris." },
    ]);
    expect(salon().players.Ana).toBeUndefined();
    const retour = await arrive("w1b", "Ana", { token });
    expect(retour.de("salon_joined")).toHaveLength(1);
    expect(salon().waiting).toEqual([]);
    expect(derniere(CTRL)).toEqual({ count: 0, names: [] });
  });

  it("après une reprise : 0 en file à l'arrivée de la régie, 1 au retour du téléphone", async () => {
    const a = await arrive("w1", "Ana", { wait: true });
    const { token } = a.de("salon_waiting")[0];
    salon().waiting = JSON.parse(JSON.stringify(salon().waiting));
    h.io.sockets.sockets.delete(a.id);
    h.emissions.length = 0;
    const regie = phone("ctrl");
    await regie.handlers.salon_join_control({ code: CODE, key: CLE });
    expect(derniere(CTRL)).toEqual({ count: 0, names: [] });
    await arrive("w1b", "Ana", { wait: true, token });
    expect(derniere(CTRL)).toEqual({ count: 1, names: ["Ana"] });
  });
});
