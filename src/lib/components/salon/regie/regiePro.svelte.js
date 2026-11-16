// L'offre ZIK Pro de la régie quand la soirée est complète : la file
// d'attente (salon_queue), le paiement en cours dans l'autre onglet, puis
// la carte « activé » gardée jusqu'à « Compris ».

// Le temps pendant lequel /pro garde le choix : au-delà, retour à l'offre
const HEURE = 60 * 60 * 1000;
const cle = (code) => `zik_regie_pro_${code}`;

/** « Hugo », « Hugo et Lina », « Hugo, Lina, Malo et 25 autres ». */
export function noms(names, count) {
  if (!names.length) return `${count} personne${count > 1 ? "s" : ""}`;
  const autres = count - names.length;
  if (autres > 0)
    return `${names.join(", ")} et ${autres} autre${autres > 1 ? "s" : ""}`;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
}

/** Les phrases de l'offre, accordées sans genre. */
export function textesFile(names, count) {
  const qui = noms(names, count);
  const un = count === 1;
  return {
    titre: un && names[0] ? `Fais entrer ${names[0]}` : "Fais-les entrer",
    attendent: `${qui} ${un ? "attend" : "attendent"}.`,
    resume: `Complet · ${count} ${un ? "attend" : "attendent"}`,
    sousTitre: `${count} ${un ? "attend" : "attendent"} à l'entrée`,
    siPlace: `${qui} ${un ? "entre" : "entrent"} si une place se libère.`,
    entrent: `${qui} ${un ? "entre" : "entrent"}`,
    entres: `${qui} ${un ? "a pris sa place" : "ont pris leur place"}.`,
  };
}

export class RegiePro {
  count = $state(0);
  names = $state([]);
  paiement = $state(false);
  // Ceux qui sont entrés à l'activation : la carte verte reste jusqu'à « Compris »
  entres = $state(null);
  #r;
  #timer;

  constructor(r) {
    this.#r = r;
  }

  onQueue = ({ count, names }) => {
    this.count = Number.isInteger(count) && count > 0 ? count : 0;
    this.names = Array.isArray(names)
      ? names.filter((n) => typeof n === "string").slice(0, 3)
      : [];
  };

  // salon_pro part avant la file vide : les noms sont encore là
  onPro = () => {
    this.entres = { count: this.count, names: this.names };
    this.#stop();
  };

  // Régie rouverte ou reconnectée : un paiement lancé d'ici a pu aboutir entre-temps
  onJoined = (pro) => {
    let at = 0;
    try {
      at = Number(localStorage.getItem(cle(this.#r.code))) || 0;
    } catch {
      /* stockage bloqué : pas de paiement en cours à reprendre */
    }
    if (!at) return;
    if (pro) {
      this.entres ??= { count: 0, names: [] };
      this.#stop();
    } else this.#wait(at);
  };

  // Sans noopener : /pro ferme son onglet pour revenir ici. La clé n'est jamais dans l'URL.
  buy = (plan) => {
    const formule = plan ? `formule=${plan}&` : "";
    const salon = encodeURIComponent(this.#r.code);
    window.open(`/pro?${formule}salon=${salon}#tarifs`, "_blank");
    if (!plan) return;
    const at = Date.now();
    try {
      localStorage.setItem(cle(this.#r.code), String(at));
    } catch {
      /* l'état tient quand même tant que la régie reste ouverte */
    }
    this.#wait(at);
  };

  cancel = () => this.#stop();
  ack = () => (this.entres = null);

  #wait(at) {
    clearTimeout(this.#timer);
    const reste = at + HEURE - Date.now();
    if (reste <= 0) return this.#stop();
    this.paiement = true;
    this.#timer = setTimeout(() => this.#stop(), reste);
  }

  #stop() {
    clearTimeout(this.#timer);
    this.paiement = false;
    try {
      localStorage.removeItem(cle(this.#r.code));
    } catch {
      /* rien à effacer */
    }
  }
}
