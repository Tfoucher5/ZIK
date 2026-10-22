import { fetchPro, proActive, goToStripe } from "$lib/client/salonClient.js";
import { PLANS } from "$lib/data/proPlans.js";

const INTENT_KEY = "zik_pro_intent";

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

  activePro = $derived(proActive(this.pro));
  subscribed = $derived(
    this.activePro && this.pro.plan !== "night" && this.pro.plan !== "manual",
  );
  nightActive = $derived(this.activePro && this.pro.plan === "night");
  endLabel = $derived(this.pro ? fmtDate(this.pro.current_period_end) : "");
  confirmed = $derived(PLANS.find((p) => p.id === this.confirmPlan));
  // Un passe Soirée s'ajoute à la suite de celui en cours
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
    $effect(() => {
      if (!zik.user) {
        this.pro = null;
        return;
      }
      this.load().then(() => {
        // Formule choisie avant de se connecter : on reprend là où on en était
        let intent = null;
        try {
          intent = sessionStorage.getItem(INTENT_KEY);
          sessionStorage.removeItem(INTENT_KEY);
        } catch {
          /* stockage indisponible */
        }
        if (intent) this.buy(intent);
      });
    });
  }

  async load() {
    const user = this.zik.user;
    if (!user) {
      this.pro = null;
      return;
    }
    this.pro = await fetchPro(this.zik.sb, user.id).catch(() => this.pro);
  }

  // Retour depuis Stripe (bouton précédent, autre onglet) : l'état affiché
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
    if (!this.zik.user) {
      try {
        sessionStorage.setItem(INTENT_KEY, plan);
      } catch {
        /* stockage indisponible */
      }
      this.zik.openAuthModal("register");
      return;
    }
    this.confirmPlan = plan;
  };

  pay = async () => {
    const plan = this.confirmPlan;
    this.busy = plan;
    try {
      await goToStripe(this.zik.sb, "/api/pro/checkout", {
        plan,
        confirm: true,
      });
    } catch (err) {
      this.payError = err.message;
      this.busy = null;
      this.confirmPlan = null;
    }
  };

  openPortal = async () => {
    this.payError = "";
    this.busy = "portal";
    try {
      await goToStripe(this.zik.sb, "/api/pro/portal");
    } catch (err) {
      this.payError = err.message;
      this.busy = null;
    }
  };
}
