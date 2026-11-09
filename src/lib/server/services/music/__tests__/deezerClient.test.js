import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deezerFetch, resetDeezerQuota } from "../deezerClient.js";

const QUOTA = { error: { code: 4, message: "Quota limit exceeded" } };
let reponses;
const appels = [];

beforeEach(() => {
  vi.useFakeTimers();
  resetDeezerQuota();
  appels.length = 0;
  reponses = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      appels.push({ url, at: Date.now() });
      const body = reponses.length ? reponses.shift() : { ok: 1 };
      return { ok: true, status: 200, json: async () => body };
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("client Deezer commun", () => {
  it("une partie passe sans attendre quand le fond a saturé le quota", async () => {
    const fond = Array.from({ length: 100 }, (_, i) =>
      deezerFetch(`/bulk/${i}`, { bulk: true }),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(appels).toHaveLength(35);

    const t = Date.now();
    await deezerFetch("/track/1");
    expect(appels.at(-1)).toEqual({
      url: "https://api.deezer.com/track/1",
      at: t,
    });

    await vi.advanceTimersByTimeAsync(20_000);
    await Promise.all(fond);
    expect(appels).toHaveLength(101);
  });

  it("le fond ne dépasse jamais 35 appels par fenêtre de 5 s", async () => {
    const fond = Array.from({ length: 100 }, (_, i) =>
      deezerFetch(`/bulk/${i}`, { bulk: true }),
    );
    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.all(fond);
    for (const a of appels) {
      const fenetre = appels.filter((b) => b.at > a.at - 5_000 && b.at <= a.at);
      expect(fenetre.length).toBeLessThanOrEqual(35);
    }
  });

  it("une ligne refusée pour quota est réessayée après la fenêtre", async () => {
    reponses = [QUOTA, { data: ["ok"] }];
    const p = deezerFetch("/search?q=x", { bulk: true });
    await vi.advanceTimersByTimeAsync(4_000);
    expect(appels).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await p).toEqual({ data: ["ok"] });
    expect(appels).toHaveLength(2);
  });

  it("un refus de quota met le fond en pause, pas la partie", async () => {
    reponses = [QUOTA];
    const partie = deezerFetch("/track/1");
    await vi.advanceTimersByTimeAsync(0);
    deezerFetch("/bulk", { bulk: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(appels.map((a) => a.url)).toEqual([
      "https://api.deezer.com/track/1",
    ]);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(await partie).toEqual({ ok: 1 });
    await deezerFetch("/track/2");
    expect(appels).toHaveLength(3);
    expect(appels.some((a) => a.url.endsWith("/bulk"))).toBe(false);
  });

  it("partie : un seul nouvel essai rapide, puis le refus est rendu", async () => {
    reponses = [QUOTA, QUOTA];
    const p = deezerFetch("/track/1");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await p).toEqual(QUOTA);
    expect(appels).toHaveLength(2);
  });

  it("erreur HTTP : levée", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(deezerFetch("/track/1")).rejects.toThrow("Deezer HTTP 503");
  });
});
