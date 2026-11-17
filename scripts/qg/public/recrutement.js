import { repartir, repli } from "./disposition.js";
import { COULEURS } from "./noms.js";

const PERIODE = 10000;

// Les bureaux suivent /agents, relue toutes les 10 s : un agent recruté entre dans la tour et rejoint
// son poste du plan (ou une place de renfort), un agent supprimé s'en va.
export class Recrutement {
  constructor(vie) {
    this.vie = vie;
    this.membres = new Set();
    this.tour();
    setInterval(() => this.tour(), PERIODE);
  }

  repli(org) {
    this.org = org;
    this.tour();
  }

  async tour() {
    let liste = null;
    try {
      const r = await fetch("/agents", { cache: "no-store" });
      if (r.ok) liste = await r.json();
      else if (r.status === 404 && this.org) liste = repli(this.org);
    } catch {
      return; // serveur arrêté : les bureaux restent tels quels
    }
    if (Array.isArray(liste)) this.appliquer(liste);
  }

  appliquer(liste) {
    const m = repartir(liste);
    for (const id of this.membres)
      if (!m.fiches.has(id)) {
        this.membres.delete(id);
        this.vie.retirer(id);
      }
    for (const [id, a] of m.fiches) {
      if (this.membres.has(id)) continue;
      const pole = Object.keys(m.equipes).find((k) =>
        m.equipes[k].includes(id),
      );
      const svc = pole ?? (m.board.includes(id) ? "board" : "renforts");
      const nom = a.nom && a.nom !== id ? a.nom : undefined;
      this.vie.ajouter(id, a.role, nom, COULEURS[svc], pole);
      this.membres.add(id);
    }
  }
}
