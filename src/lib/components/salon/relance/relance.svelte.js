import {
  ECART_MIN_MS,
  REMONTAGE_MS,
  REPLI_MS,
  RESEAU_MS,
  SANS_NAVIGATION_MS,
  refDe,
  zikAnswers,
} from "./relance.js";
import { sendCrash } from "./journal.js";
import { compterEssai, noterRelance } from "./compteur.js";
import { markAutoResume, readResume } from "../play/resume.js";

const NOMS = { host: "TV", regie: "de régie", play: "de téléphone" };

function depsParDefaut() {
  return {
    now: () => Date.now(),
    timers: globalThis,
    fetch: (...a) => globalThis.fetch(...a),
    reload: () => location.reload(),
    get storage() {
      return sessionStorage;
    },
    get local() {
      return localStorage;
    },
    get doc() {
      return document;
    },
    get win() {
      return window;
    },
    get nav() {
      return navigator;
    },
  };
}

export class Relance {
  essai = $state(1);
  mode = $state("auto");
  sec = $state(3);
  joue = $state(false);
  ref = $state("");
  adminPrevenu = $state(false);

  #d;
  #error;
  #version;
  #onRemount;
  #cle;
  #cible = 0;
  #derniere = -Infinity;
  #prochainReseau = 0;
  #verif = false;
  #fini = false;
  #remonte = false;
  #appel = false;
  #tic = null;
  #timeouts = [];
  #off = [];

  constructor({ ecran, code, error, version, onRemount, deps } = {}) {
    this.ecran = ecran;
    this.code = code ?? "";
    this.#error = error;
    this.#version = version;
    this.#onRemount = onRemount;
    // Sans lire les getters : rien du navigateur n'est touché avant start()
    this.#d = Object.defineProperties(
      depsParDefaut(),
      Object.getOwnPropertyDescriptors(deps ?? {}),
    );
    this.#cle = `zik_relance_${ecran}_${this.code}`;
  }

  start() {
    try {
      const now = this.#d.now();
      this.ref = refDe(this.code, now);
      this.#joueOuPas();
      const { essai, delai, precedente } = compterEssai(
        this.#d,
        this.#cle,
        now,
      );
      this.essai = essai;
      this.#derniere = precedente;
      this.#cible = now + delai * 1000;
      this.mode = essai > 3 ? "pause" : "auto";
      this.sec = this.mode === "auto" ? delai : null;
      sendCrash(
        {
          ecran: this.ecran,
          code: this.code,
          essai,
          version: this.#version,
          error: this.#error,
        },
        { fetch: this.#d.fetch },
      );
      this.#ecouter();
      this.#tic = this.#d.timers.setInterval(() => this.#tictac(), 250);
    } catch {
      this.#repli();
    }
  }

  maintenant = () => {
    if (this.#fini) return;
    this.#cible = this.#d.now();
    this.#essayer(true);
  };

  appelerAdmin = async () => {
    if (this.#appel || this.adminPrevenu) return;
    this.#appel = true;
    try {
      const r = await this.#d.fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "bug",
          subject: "salon",
          room_id: this.code || null,
          message: `Écran ${NOMS[this.ecran] ?? ""} bloqué sur l'écran de relance, salon ${this.code}`,
          metadata: { context: { relance: true, essai: this.essai } },
        }),
      });
      if (r?.ok) this.adminPrevenu = true;
    } catch {
      /* réseau : le bouton reste disponible */
    }
    this.#appel = false;
  };

  destroy() {
    this.#fini = true;
    this.#arreter();
  }

  #arreter() {
    try {
      this.#d.timers.clearInterval(this.#tic);
      for (const t of this.#timeouts) this.#d.timers.clearTimeout(t);
      for (const off of this.#off) off();
    } catch {
      /* rien à arrêter */
    }
    this.#tic = null;
    this.#timeouts = [];
    this.#off = [];
  }

  #joueOuPas() {
    if (this.ecran !== "play") return;
    try {
      this.joue = !!readResume(this.#d.local, this.code).resume;
    } catch {
      this.joue = false;
    }
  }

  #ecouter() {
    const on = (cible, ev, fn) => {
      cible.addEventListener(ev, fn);
      this.#off.push(() => cible.removeEventListener(ev, fn));
    };
    const reprise = () => {
      if (this.mode === "reseau") this.#essayer(false);
      else this.#tictac();
    };
    on(this.#d.doc, "visibilitychange", () => {
      if (!this.#cache()) reprise();
    });
    on(this.#d.win, "online", reprise);
  }

  #cache() {
    return this.#d.doc.visibilityState === "hidden";
  }

  #tictac() {
    if (this.#fini) return;
    try {
      const now = this.#d.now();
      if (this.mode === "reseau") {
        if (now >= this.#prochainReseau) this.#essayer(false);
        return;
      }
      const reste = this.#cible - now;
      if (this.mode === "auto") this.sec = Math.max(0, Math.ceil(reste / 1000));
      if (reste <= 0) this.#essayer(false);
    } catch {
      this.#repli();
    }
  }

  async #essayer(bouton) {
    if (this.#fini || this.#verif) return;
    try {
      const now = this.#d.now();
      if (!bouton && this.#cache()) return;
      if (now - this.#derniere < ECART_MIN_MS) {
        this.#cible = this.#derniere + ECART_MIN_MS;
        return;
      }
      this.#verif = true;
      const ok =
        this.#d.nav.onLine !== false &&
        (await zikAnswers(this.#d.fetch, this.#d.timers));
      this.#verif = false;
      if (this.#fini) return;
      if (!ok) {
        this.mode = "reseau";
        this.sec = null;
        this.#prochainReseau = this.#d.now() + RESEAU_MS;
        return;
      }
      if (!bouton && this.#cache()) return;
      this.#relancer();
    } catch {
      this.#verif = false;
      this.#repli();
    }
  }

  #relancer() {
    const now = this.#d.now();
    this.#derniere = now;
    noterRelance(this.#d, this.#cle, { essai: this.essai, at: now });
    if (this.ecran === "play" && this.joue) {
      try {
        const { code } = readResume(this.#d.local, this.code).resume;
        markAutoResume(code, this.#d.storage, now);
      } catch {
        /* carte « Re-bonjour » */
      }
    }
    if (this.essai === 1 && this.#onRemount && !this.#remonte) {
      this.#remonte = true;
      // Encore là 5 s après le remontage : on recharge
      this.#reprendreDans(REMONTAGE_MS);
      try {
        this.#onRemount();
        return;
      } catch {
        /* rechargement */
      }
    }
    // Navigation qui n'a pas lieu (navigateur figé, rechargement bloqué) : nouvel essai lent
    this.#reprendreDans(SANS_NAVIGATION_MS);
    this.#d.reload();
  }

  #reprendreDans(ms) {
    this.#fini = true;
    for (const t of this.#timeouts) this.#d.timers.clearTimeout(t);
    this.#timeouts = [
      this.#d.timers.setTimeout(() => {
        this.#fini = false;
        this.#cible = this.#d.now();
        this.#tictac();
      }, ms),
    ];
  }

  #repli() {
    this.#fini = true;
    this.#arreter();
    try {
      this.#tic = this.#d.timers.setInterval(() => {
        if (this.#d.nav?.onLine !== false) this.#d.reload();
      }, REPLI_MS);
    } catch {
      /* rien de plus sûr à faire */
    }
  }
}
