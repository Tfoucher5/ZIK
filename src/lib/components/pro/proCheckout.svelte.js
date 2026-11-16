import { untrack } from "svelte";
import {
  fetchPro,
  proActive,
  goToStripe,
  salonKey,
} from "$lib/client/salonClient.js";
import { PLANS } from "$lib/data/proPlans.js";
import {
  readIntent,
  saveIntent,
  forgetIntent,
  stepOf,
  backToRegie,
} from "./intent.js";

const PANNE = "Stripe ne répond pas, réessayez dans un instant.";

const fmtDate = (d) =>
  new Date(d).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

// Accès ZIK Pro du compte et parcours de paiement de la page /pro
export class ProCheckout {
  pro = $state(null);
  busy = $state(null);
  payError = $state("");
  confirmPlan = $state(null);
  // Formule et soirée choisies (arrivée par la régie, ou avant de se connecter)
  intent = $state(null);
  pendingEmail = $state("");
  attaching = $state(false);
  attached = $state(false);
  attachError = $state("");
  activated = $state(false);

  activePro = $derived(proActive(this.pro));
  subscribed = $derived(
    this.activePro && this.pro.plan !== "night" && this.pro.plan !== "manual",
  );
  nightActive = $derived(this.activePro && this.pro.plan === "night");
  endLabel = $derived(this.pro ? fmtDate(this.pro.current_period_end) : "");
  confirmed = $derived(PLANS.find((p) => p.id === this.confirmPlan));
  regie = $derived(this.intent?.salon ?? null);
  chosen = $derived(PLANS.find((p) => p.id === this.intent?.plan));
  step = $derived(
    stepOf({
      user: this.zik.user,
      plan: this.intent?.plan,
      pendingEmail: this.pendingEmail,
      activated: this.activated,
    }),
  );
  // Une Soirée 24 h s'ajoute à la suite de celle en cours
  nightEnd = $derived(
    fmtDate(
      (this.nightActive
        ? Date.parse(this.pro.current_period_end)
        : Date.now()) +
        24 * 3600_000,
    ),
  );

  constructor(zik) {
    this.zik = zik;
    $effect(() => this.arrive());
    $effect(() => {
      if (!zik.user) {
        this.pro = null;
        return;
      }
      this.load().then(() => untrack(() => this.resume()));
    });
  }

  arrive() {
    const it = readIntent(location.search, localStorage, salonKey);
    this.intent = it;
    // Retour de Google ou du lien de confirmation : /pro sans ancre
    if (it?.salon && !location.hash)
      document.getElementById("tarifs")?.scrollIntoView();
  }

  async load() {
    const user = this.zik.user;
    if (!user) {
      this.pro = null;
      return;
    }
    this.pro = await fetchPro(this.zik.sb, user.id).catch(() => this.pro);
  }

  // Une fois connecté, on reprend là où on en était
  resume() {
    if (this.regie) {
      if (!this.attached && !this.attaching) return this.attach();
      return;
    }
    const plan = this.intent?.plan;
    if (!plan) return;
    forgetIntent(localStorage);
    this.intent = null;
    this.buy(plan);
  }

  // Rattache la soirée au compte connecté, sans jamais payer
  attach = async () => {
    const salon = this.regie;
    this.attaching = true;
    this.attachError = "";
    try {
      const d = await goToStripe(
        this.zik.sb,
        "/api/pro/checkout",
        { salon, key: salonKey(salon), attach: true },
        PANNE,
      );
      this.attached = true;
      if (d.activated) this.done();
    } catch (err) {
      this.attachError = err.message;
    } finally {
      this.attaching = false;
    }
  };

  done() {
    this.activated = true;
    forgetIntent(localStorage);
    this.load();
  }

  // Retour de Stripe (bouton précédent, autre onglet) : l'état affiché
  // doit être celui du compte, pas celui d'avant le paiement
  refresh = (e) => {
    if (e.type === "visibilitychange" && document.visibilityState !== "visible")
      return;
    this.busy = null;
    this.load();
  };

  cancel = () => {
    if (this.busy === null) this.confirmPlan = null;
  };

  buy = (plan) => {
    this.payError = "";
    // Depuis la régie, une carte change la formule ; le bloc garde le parcours
    if (this.regie && !this.activated) {
      this.intent = { plan, salon: this.regie };
      saveIntent(localStorage, this.intent);
      document.getElementById("depuis-regie")?.scrollIntoView();
      return;
    }
    if (!this.zik.user) {
      saveIntent(localStorage, { plan, salon: null });
      this.zik.openAuthModal("register", { next: "/pro" });
      return;
    }
    this.confirmPlan = plan;
  };

  account = (view) => {
    const c = this.chosen;
    this.zik.openAuthModal(view, {
      next: "/pro",
      note: `${c.name} · ${c.price} pour la soirée ${this.regie}`,
      onRegistered: (email) => (this.pendingEmail = email),
    });
  };

  back = () => backToRegie(this.regie);

  pay = async () => {
    const plan = this.confirmPlan;
    this.busy = plan;
    try {
      await goToStripe(
        this.zik.sb,
        "/api/pro/checkout",
        { plan, confirm: true },
        PANNE,
      );
    } catch (err) {
      this.payError = err.message;
      this.busy = null;
      this.confirmPlan = null;
    }
  };

  // Depuis la régie : le récapitulatif est dans le bloc, pas de fenêtre « Confirmer »
  payDirect = async () => {
    const { plan, salon } = this.intent;
    this.payError = "";
    this.busy = plan;
    try {
      const d = await goToStripe(
        this.zik.sb,
        "/api/pro/checkout",
        { plan, salon, key: salonKey(salon) },
        PANNE,
      );
      if (d?.activated) {
        this.busy = null;
        this.done();
      }
    } catch (err) {
      this.payError = err.message;
      this.busy = null;
    }
  };

  openPortal = async () => {
    this.payError = "";
    this.busy = "portal";
    try {
      await goToStripe(this.zik.sb, "/api/pro/portal", {}, PANNE);
    } catch (err) {
      this.payError = err.message;
      this.busy = null;
    }
  };
}
