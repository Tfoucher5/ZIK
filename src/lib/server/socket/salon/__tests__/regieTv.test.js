import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mêmes neutralisations que screens.test.js : seuls comptent ici le badge
// « Régie connectée » de la TV et le volume partagé entre TV et régie.
vi.mock("../../../config.js", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        in: async () => ({ data: [] }),
      }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: "g1" } }) }),
        then: (r) => r({ error: null }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
  getAdminClient: () => ({
    rpc: async () => ({ data: null, error: null }),
    from: () => ({ insert: () => ({ then: (r) => r({ error: null }) }) }),
  }),
}));
vi.mock("../../game/audio.js", () => ({ validPreviewUrl: () => null }));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
}));
const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { cleanupNow } = await import("../timers.js");
const { CONTROL_LEAVE_DELAY } = await import("../leave.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

const TV = `salon:screens:${CODE}`;
const REGIE = `salon:ctrl:${CODE}`;

let h;

beforeEach(() => {
  vi.useFakeTimers();
  for (const k of Object.keys(salonRooms)) delete salonRooms[k];
  salonDeTest();
  h = makeIo();
  registerSalon(h.io);
});

afterEach(() => {
  clearTimeout(salonRooms[CODE]?._hostDcTimer);
  vi.useRealTimers();
});

function branche(id, event) {
  const s = makeSocket(id, h.rooms);
  s.recu = [];
  s.emit = (e, payload) => s.recu.push({ event: e, payload });
  h.connecte(s);
  s.handlers[event]({ code: CODE, key: CLE });
  return s;
}
const tv = (id = "tv") => branche(id, "salon_join_host");
const regie = (id = "regie") => branche(id, "salon_join_control");

const versLaTv = (event) =>
  h.emissions.filter((e) => e.event === event && e.cibles.includes(TV));
const regiesVuesParLaTv = () =>
  versLaTv("salon_controls").at(-1)?.payload.count;

describe("badge « Régie connectée » de la TV", () => {
  it("la TV apprend le nombre de régies à son arrivée", () => {
    regie();
    tv();
    expect(regiesVuesParLaTv()).toBe(1);
  });

  it("une régie qui arrive est annoncée tout de suite, au pluriel aussi", () => {
    tv();
    regie("r1");
    expect(regiesVuesParLaTv()).toBe(1);
    regie("r2");
    expect(regiesVuesParLaTv()).toBe(2);
  });

  it("une régie qui part n'est annoncée qu'après le délai", () => {
    tv();
    const r = regie();
    r.deconnecte();
    expect(regiesVuesParLaTv()).toBe(1);
    vi.advanceTimersByTime(CONTROL_LEAVE_DELAY);
    expect(regiesVuesParLaTv()).toBe(0);
  });

  it("une régie rechargée ne fait pas clignoter le badge", () => {
    tv();
    regie("r1").deconnecte();
    regie("r2");
    const avant = versLaTv("salon_controls").length;
    vi.advanceTimersByTime(CONTROL_LEAVE_DELAY * 2);
    expect(versLaTv("salon_controls").length).toBe(avant);
    expect(regiesVuesParLaTv()).toBe(1);
  });

  it("la fermeture du salon annule l'annonce en attente", () => {
    tv();
    regie().deconnecte();
    cleanupNow(CODE, h.io);
    const avant = versLaTv("salon_controls").length;
    vi.advanceTimersByTime(CONTROL_LEAVE_DELAY);
    expect(versLaTv("salon_controls").length).toBe(avant);
  });
});

describe("volume de la TV partagé avec la régie", () => {
  it("la TV annonce son volume, les régies le reçoivent", () => {
    const t = tv();
    t.handlers.salon_tv_volume({ volume: 35 });
    const vu = h.emissions.filter(
      (e) => e.event === "salon_volume" && e.cibles.includes(REGIE),
    );
    expect(vu.at(-1).payload).toEqual({ volume: 35 });
    expect(salonRooms[CODE]._tvVolume).toBe(35);
  });

  it("une régie qui arrive reçoit le vrai volume, pas 100", () => {
    tv().handlers.salon_tv_volume({ volume: 20 });
    const r = regie();
    const joined = r.recu.find((e) => e.event === "salon_control_joined");
    expect(joined.payload.tvVolume).toBe(20);
  });

  it("sans volume connu, la régie reçoit null", () => {
    const r = regie();
    const joined = r.recu.find((e) => e.event === "salon_control_joined");
    expect(joined.payload.tvVolume).toBeNull();
  });

  it("une régie ne peut pas se faire passer pour la TV", () => {
    tv();
    regie().handlers.salon_tv_volume({ volume: 5 });
    expect(salonRooms[CODE]._tvVolume).toBeUndefined();
  });

  it("un joueur ou un inconnu ne touche pas au volume", () => {
    const s = makeSocket("x", h.rooms);
    h.connecte(s);
    s.handlers.salon_tv_volume({ volume: 5 });
    s.handlers.salon_volume({ volume: 5 });
    expect(salonRooms[CODE]._tvVolume).toBeUndefined();
  });

  it("régie gratuite : refus Pro, volume inchangé", () => {
    tv().handlers.salon_tv_volume({ volume: 60 });
    const r = regie();
    r.handlers.salon_volume({ volume: 10 });
    expect(r.recu.at(-1)).toEqual({
      event: "salon_pro_required",
      payload: { feature: "volume" },
    });
    expect(salonRooms[CODE]._tvVolume).toBe(60);
  });

  it("régie Pro : la TV et les autres régies suivent", () => {
    salonRooms[CODE].pro = true;
    tv();
    regie().handlers.salon_volume({ volume: 70 });
    const envoi = h.emissions.filter((e) => e.event === "salon_volume").at(-1);
    expect(envoi.cibles).toEqual([TV, REGIE]);
    expect(envoi.payload).toEqual({ volume: 70 });
    expect(salonRooms[CODE]._tvVolume).toBe(70);
  });
});
