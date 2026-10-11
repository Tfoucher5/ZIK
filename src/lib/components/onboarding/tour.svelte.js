import { goto } from "$app/navigation";
import { STEPS } from "./steps.js";

const FALLBACK_AFTER = 1500;
const TIMEOUT = 4000;
const NARROW_TOP = 72;

function isVisible(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function find(selectors = []) {
  for (const sel of selectors) {
    const el = [...document.querySelectorAll(sel)].find(isVisible);
    if (el) return el;
  }
  return null;
}

function waitUntil(fn, timeout) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const loop = () => {
      const elapsed = performance.now() - t0;
      const v = fn(elapsed);
      if (v || elapsed > timeout) resolve(v);
      else setTimeout(loop, 50);
    };
    loop();
  });
}

export class Tour {
  i = $state(0);
  el = $state(null);
  clickable = $state(false);
  busy = $state(false);
  clicked = $state(false);
  #token = 0;

  get step() {
    return STEPS[this.i];
  }
  get count() {
    return STEPS.length;
  }
  get last() {
    return this.i === STEPS.length - 1;
  }

  async go(i) {
    const token = ++this.#token;
    const s = STEPS[i];
    this.i = i;
    this.el = null;
    this.clicked = false;
    this.clickable = false;
    if (!s.target) return;

    this.busy = true;
    if (s.path && location.pathname !== s.path) await goto(s.path);
    const el = await waitUntil(
      (t) => find(s.target) || (t > FALLBACK_AFTER && find(s.fallback)),
      s.path ? TIMEOUT : 300,
    );
    if (token !== this.#token) return;

    if (el && !el.closest("#navbar, #bottom-nav")) {
      const r = el.getBoundingClientRect();
      // Petit écran : la cible remonte en haut pour laisser la place à la carte du guide en dessous.
      if (innerWidth < 700) {
        if (Math.abs(r.top - NARROW_TOP) > 24) {
          scrollBy({ top: r.top - NARROW_TOP, behavior: "smooth" });
        }
      } else if (r.top < 70 || r.bottom > innerHeight - 90) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    this.el = el || null;
    this.clickable =
      !!el && s.mode !== "look" && el.matches(s.target.join(","));
    this.busy = false;
  }

  next() {
    if (!this.last) this.go(this.i + 1);
  }

  prev() {
    if (this.i > 0) this.go(this.i - 1);
  }

  async onTargetClick() {
    const s = this.step;
    if (s.mode === "click") this.clicked = true;
    if (s.mode !== "nav") return;
    const token = this.#token;
    this.busy = true;
    await waitUntil(() => location.pathname === s.to, TIMEOUT);
    if (token === this.#token) this.next();
  }

  stop() {
    this.#token++;
    this.el = null;
    this.busy = false;
  }
}
