import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Relance } from "../relance.svelte.js";
import { appareil, stockage } from "./appareil.js";
import { takeAutoResume } from "../../play/resume.js";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 23, 21, 30, 0));
});
afterEach(() => vi.useRealTimers());

describe("Relance", () => {
  it("3, 10, 30 s puis pause d'une minute, sans fin", async () => {
    const a = appareil();
    const attendus = [
      [1, "auto", 3],
      [2, "auto", 10],
      [3, "auto", 30],
      [4, "pause", null],
      [5, "pause", null],
    ];
    for (const [essai, mode, sec] of attendus) {
      const r = a.ouvrir();
      expect([r.essai, r.mode, r.sec]).toEqual([essai, mode, sec]);
      const ms = (sec ?? 60) * 1000;
      await vi.advanceTimersByTimeAsync(ms - 500);
      expect(a.reload).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(500);
      expect(a.reload).toHaveBeenCalledOnce();
      a.reload.mockClear();
      r.destroy();
    }
  });

  it("repart de zéro après 2 min sans plantage", async () => {
    const a = appareil();
    a.ouvrir();
    await vi.advanceTimersByTimeAsync(3000);
    vi.setSystemTime(Date.now() + 121000);
    expect(a.ouvrir().essai).toBe(1);
  });

  it("le bouton relance tout de suite et compte comme un essai", async () => {
    const a = appareil();
    a.ouvrir().maintenant();
    await vi.advanceTimersByTimeAsync(0);
    expect(a.reload).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(5000);
    expect(a.ouvrir().essai).toBe(2);
  });

  it("jamais deux relances en moins de 3 s", async () => {
    const a = appareil();
    a.ouvrir().maintenant();
    await vi.advanceTimersByTimeAsync(0);
    a.reload.mockClear();
    const r = a.ouvrir();
    r.maintenant();
    await vi.advanceTimersByTimeAsync(2900);
    expect(a.reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(a.reload).toHaveBeenCalledOnce();
  });

  it("onglet caché : pas de relance, reprise au retour", async () => {
    const a = appareil();
    a.ouvrir();
    a.doc.visibilityState = "hidden";
    await vi.advanceTimersByTimeAsync(20000);
    expect(a.reload).not.toHaveBeenCalled();
    a.doc.visibilityState = "visible";
    a.doc.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(a.reload).toHaveBeenCalledOnce();
  });

  for (const [nom, healthz, attente] of [
    ["échec", () => Promise.reject(new Error("x")), 0],
    ["502", () => Promise.resolve({ status: 502 }), 0],
    ["4 s sans réponse", () => new Promise(() => {}), 4000],
  ])
    it(`healthz ${nom} : état Réseau, puis retour seul`, async () => {
      const a = appareil();
      a.healthz = healthz;
      const r = a.ouvrir();
      await vi.advanceTimersByTimeAsync(3000 + attente);
      expect([r.mode, r.sec]).toEqual(["reseau", null]);
      expect(a.reload).not.toHaveBeenCalled();
      const avant = a.healthzCalls().length;
      await vi.advanceTimersByTimeAsync(5000 + attente);
      expect(a.healthzCalls().length).toBeGreaterThan(avant);
      a.healthz = () => Promise.resolve({ status: 200 });
      await vi.advanceTimersByTimeAsync(5000 + attente);
      expect(a.reload).toHaveBeenCalledOnce();
    });

  it("hors ligne : Réseau sans appel, relance sur « online »", async () => {
    const a = appareil();
    a.nav.onLine = false;
    const r = a.ouvrir();
    await vi.advanceTimersByTimeAsync(3000);
    expect(r.mode).toBe("reseau");
    expect(a.healthzCalls()).toHaveLength(0);
    a.nav.onLine = true;
    a.win.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);
    expect(a.reload).toHaveBeenCalledOnce();
  });

  it("remontage au 1er essai, rechargement ensuite", async () => {
    const a = appareil();
    const onRemount = vi.fn();
    const r1 = a.ouvrir({ onRemount });
    await vi.advanceTimersByTimeAsync(3000);
    expect(onRemount).toHaveBeenCalledOnce();
    expect(a.reload).not.toHaveBeenCalled();
    r1.destroy();
    const r2 = a.ouvrir({ onRemount });
    expect(r2.essai).toBe(2);
    await vi.advanceTimersByTimeAsync(10000);
    expect(onRemount).toHaveBeenCalledOnce();
    expect(a.reload).toHaveBeenCalledOnce();
  });

  it("remontage sans effet : rechargement 5 s après", async () => {
    const a = appareil();
    const onRemount = vi.fn();
    a.ouvrir({ onRemount });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(4900);
    expect(a.reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(a.reload).toHaveBeenCalledOnce();
    expect(a.healthzCalls()).toHaveLength(2);
  });

  it("remontage qui lève : rechargement tout de suite", async () => {
    const a = appareil();
    a.ouvrir({
      onRemount: () => {
        throw new Error("x");
      },
    });
    await vi.advanceTimersByTimeAsync(3000);
    expect(a.reload).toHaveBeenCalledOnce();
  });

  it("exception dans le tic : repli, rechargement à 30 s", async () => {
    const a = appareil();
    const r = new Relance({
      ecran: "host",
      code: a.code,
      deps: {
        now: () => {
          if (r.essai === 1 && r.ref) throw new Error("tic");
          return Date.now();
        },
        reload: a.reload,
        fetch: a.fetch,
        storage: a.storage,
        doc: a.doc,
        win: a.win,
        nav: a.nav,
      },
    });
    r.start();
    await vi.advanceTimersByTimeAsync(30000);
    expect(a.reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(a.reload).toHaveBeenCalledOnce();
  });

  it("rechargement sans navigation : nouvel essai à 60 s", async () => {
    const a = appareil();
    a.ouvrir();
    await vi.advanceTimersByTimeAsync(3000);
    expect(a.reload).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(59900);
    expect(a.reload).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(400);
    expect(a.reload).toHaveBeenCalledTimes(2);
    expect(a.healthzCalls()).toHaveLength(2);
  });

  it("rechargement sans effet : pause, le bouton relance", async () => {
    const a = appareil();
    const r = a.ouvrir();
    await vi.advanceTimersByTimeAsync(3000);
    expect([r.mode, r.sec]).toEqual(["auto", 0]);
    await vi.advanceTimersByTimeAsync(3000);
    expect([r.mode, r.sec]).toEqual(["pause", null]);
    r.maintenant();
    await vi.advanceTimersByTimeAsync(0);
    expect(a.reload).toHaveBeenCalledTimes(2);
  });

  it("horloge qui recule : le bouton relance quand même", async () => {
    const a = appareil();
    const r = a.ouvrir();
    await vi.advanceTimersByTimeAsync(6000);
    vi.setSystemTime(Date.now() - 3600000);
    r.maintenant();
    await vi.advanceTimersByTimeAsync(3100);
    expect(a.reload).toHaveBeenCalledTimes(2);
  });

  it("destroy arrête tout", async () => {
    const a = appareil();
    a.ouvrir().destroy();
    await vi.advanceTimersByTimeAsync(120000);
    expect(a.reload).not.toHaveBeenCalled();
  });

  it("envoie un journal au départ, une seule fois ; réf. code et heure", async () => {
    const a = appareil({ ecran: "regie" });
    const r = a.ouvrir();
    expect(r.ref).toBe(`${a.code} · 21:30`);
    const crash = a.fetch.mock.calls.filter(([u]) => u === "/api/salon/crash");
    expect(crash).toHaveLength(1);
    expect(JSON.parse(crash[0][1].body)).toMatchObject({
      ecran: "regie",
      essai: 1,
      version: "3.34.0",
    });
  });

  it("téléphone qui jouait : joue, marqueur de reprise posé avant la relance", async () => {
    const local = stockage({
      salon_user: "Ana",
      salon_at: String(Date.now()),
    });
    const a = appareil({ ecran: "play", local });
    local.v.salon_code = a.code;
    local.v["zik_salon_player_" + a.code] = "jeton";
    const r = a.ouvrir();
    expect(r.joue).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(a.reload).toHaveBeenCalledOnce();
    expect(takeAutoResume(a.code, a.storage)).toBe(true);
  });

  it("téléphone sur le formulaire : ni joue ni marqueur", async () => {
    const a = appareil({ ecran: "play" });
    const r = a.ouvrir();
    expect(r.joue).toBe(false);
    await vi.advanceTimersByTimeAsync(3000);
    expect(a.storage.v.salon_auto_resume).toBeUndefined();
  });

  it("appeler un admin : « Admin prévenu » seulement si c'est parti", async () => {
    const a = appareil({ ecran: "regie" });
    const r = a.ouvrir();
    a.fetch.mockImplementationOnce(() => Promise.reject(new Error("réseau")));
    a.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false }));
    await r.appelerAdmin();
    await r.appelerAdmin();
    expect(r.adminPrevenu).toBe(false);
    await r.appelerAdmin();
    expect(r.adminPrevenu).toBe(true);
    const body = JSON.parse(a.fetch.mock.calls.at(-1)[1].body);
    expect(body).toMatchObject({
      type: "bug",
      subject: "salon",
      room_id: a.code,
      message: `Écran de régie bloqué sur l'écran de relance, salon ${a.code}`,
    });
  });
});
