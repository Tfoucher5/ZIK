import { disposer, repartir, repli } from "./disposition.js";
import { COULEURS, limites } from "./plan.js";

const PERIODE = 10000;

// Les bureaux suivent /agents, relue toutes les 10 s : un agent recruté sort de l'ascenseur et prend
// un poste libre de son pôle, un agent supprimé repart. Un pôle plein fait remonter un plateau agrandi.
export class Recrutement {
  constructor(scene) {
    this.s = scene;
    this.modele = repartir([]);
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
    if (!this.s.d) return this.monter(m);
    this.modele = m;
    for (const id of this.membres) if (!m.fiches.has(id)) this.partir(id);
    for (const id of m.fiches.keys())
      if (
        !this.membres.has(id) &&
        !this.embaucher(id, true) &&
        this.s.d.services[this.service(id)]
      )
        return this.monter(m);
  }

  monter(m) {
    this.modele = m;
    this.membres = new Set();
    const d = disposer(
      Object.fromEntries(
        Object.entries(m.equipes).map(([k, v]) => [k, v.length]),
      ),
    );
    this.s.monter(d, limites(d.ouest));
    for (const id of m.fiches.keys()) this.embaucher(id, false);
  }

  // Pôle d'un agent, « board », ou « renforts » pour les agents sans pôle.
  service(id) {
    if (id === "renforts" || this.modele.autres.includes(id)) return "renforts";
    if (this.s.d?.services[id]) return id;
    if (this.modele.board.includes(id)) return "board";
    return Object.keys(this.modele.equipes).find((k) =>
      this.modele.equipes[k].includes(id),
    );
  }

  // Postes d'un service que personne n'occupe à demeure : les copies s'y installent.
  libres(svc) {
    const d = this.s.d;
    const postes =
      svc === "renforts" ? d.renforts : (d.services[svc]?.postes ?? []);
    const pris = new Set(
      [...this.s.persos.values()]
        .filter((p) => !p.temporaire)
        .map((p) => p.siege),
    );
    return postes.filter((p) => !pris.has(p));
  }

  siege(id, svc) {
    const d = this.s.d;
    const pris = new Set([...this.s.persos.values()].map((p) => p.siege));
    if (svc === "board")
      for (const s of id === "avocat" ? [d.avocat, d.invite] : [d.invite])
        if (!pris.has(s)) return s;
    return (d.services[svc]?.postes ?? d.renforts).find((p) => !pris.has(p));
  }

  embaucher(id, arrivee) {
    const svc = this.service(id);
    const siege = this.siege(id, svc);
    if (!siege) return false;
    this.s.retirer(id);
    const a = this.modele.fiches.get(id);
    const nom = a.nom && a.nom !== id ? a.nom : undefined;
    const p = this.s.perso(
      id,
      a.role,
      COULEURS[svc],
      arrivee ? this.s.d.ascenseur : siege,
      nom,
    );
    p.siege = siege;
    if (arrivee) {
      p.aller(siege);
      p.arrivee = 12;
    }
    this.membres.add(id);
    return true;
  }

  partir(id) {
    this.membres.delete(id);
    const p = this.s.persos.get(id);
    if (!p) return;
    Object.assign(p, { temporaire: true, voulu: false, depart: true });
    p.aller(this.s.d.ascenseur);
  }
}
