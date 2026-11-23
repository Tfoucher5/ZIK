import { vi } from "vitest";
import { Relance } from "../relance.svelte.js";

export const stockage = (v = {}) => ({
  v,
  getItem: (k) => v[k] ?? null,
  setItem: (k, x) => (v[k] = String(x)),
  removeItem: (k) => delete v[k],
});
export const bloque = {
  getItem() {
    throw new Error("SecurityError");
  },
  setItem() {
    throw new Error("SecurityError");
  },
};

let n = 0;
// Un appareil : stockage de session et horloge partagés entre rechargements
export function appareil({ ecran = "host", local = stockage(), storage } = {}) {
  const code = "C" + String(++n).padStart(5, "0");
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const win = new EventTarget();
  const nav = { onLine: true };
  const a = {
    code,
    doc,
    win,
    nav,
    healthz: () => Promise.resolve({ status: 200 }),
    reload: vi.fn(),
    storage: storage ?? stockage(),
    fetch: vi.fn((url) =>
      url === "/healthz" ? a.healthz() : Promise.resolve({ ok: true }),
    ),
    ouvrir(opts = {}) {
      const r = new Relance({
        ecran,
        code,
        error: new Error("plantage"),
        version: "3.34.0",
        ...opts,
        deps: {
          reload: a.reload,
          fetch: a.fetch,
          storage: a.storage,
          local,
          doc,
          win,
          nav,
        },
      });
      r.start();
      return r;
    },
    healthzCalls: () => a.fetch.mock.calls.filter(([u]) => u === "/healthz"),
  };
  return a;
}
