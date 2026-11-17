import * as THREE from "three";
import { fiche } from "../noms.js";
import { Perso } from "../perso.js";
import { niveau } from "../tour/plan.js";
import { VISITEUR, droits, grille, itineraire, paliers } from "./acces.js";
import { creneau, lieu, ou, salleDe } from "./agenda.js";
import { versLocal } from "./repere.js";

// Ces métiers restent à leur poste ; les autres se réunissent dans la salle du pôle dès qu'ils sont deux.
const AU_POSTE = ["dev", "test-writer", "reviewer", "recette", "incident"];
const RENFORTS = ["wrecking-crew", "funk-brothers"];
const debout = (p) => ({
  place: new THREE.Vector3(p.x, 0, p.z),
  angle: 0,
  debout: true,
});
// Sur le parvis, devant le tambour du hall et devant le café public.
const PARVIS = debout(versLocal(-1.6, 12.6));
const TERRASSE = debout(versLocal(5, 27));
const DEHORS = { niveau: "n0", but: PARVIS, dehors: true };

// La vie de la tour : chacun à son poste, en réunion ou dans sa journée, d'étage en étage par les ascenseurs.
export class Vie {
  constructor(s) {
    this.s = s;
    this.persos = new Map();
    this.grilles = new Map();
    this.visiteurs = 0;
    this.prochainVisiteur = 5;
    this.horloge = 0;
  }

  grille(id, d) {
    const k = `${id}|${[...d].sort()}`;
    if (!this.grilles.has(k)) this.grilles.set(k, grille(niveau(id), d));
    return this.grilles.get(k);
  }

  // Places prises par les autres.
  pris(moi) {
    return new Set(
      [...this.persos.values()].filter((p) => p !== moi).map((p) => p.but),
    );
  }

  siege(piece, rang = 0, moi = null) {
    const l = this.s.interieurs[piece.niveau].lieux[piece.piece];
    if (!l?.sieges.length) return null;
    const pris = this.pris(moi);
    const n = l.sieges.length;
    for (let k = 0; k < n; k++) {
      const s = l.sieges[(rang + k) % n];
      if (!pris.has(s)) return { niveau: piece.niveau, but: s };
    }
    return { niveau: piece.niveau, but: l.sieges[rang % n] };
  }

  // Son poste du plan, sinon une place libre dans une salle de renforts.
  poste(id) {
    for (const [n, i] of Object.entries(this.s.interieurs))
      if (i.postes[id]) return { niveau: n, but: i.postes[id] };
    for (const r of RENFORTS) {
      const s = this.siege(ou(r));
      if (s && !this.pris().has(s.but)) return s;
    }
    return this.siege(ou(RENFORTS[0]));
  }

  ajouter(id, role, nom, couleur, pole) {
    this.retirer(id);
    const base = fiche(id, role ?? id);
    const f = { ...base, ...(nom && { nom }), ...(role && { role }) };
    const d = droits(id, pole);
    const poste = this.poste(id);
    const g = this.s.tour.groupes[poste.niveau];
    const p = new Perso(
      g,
      this.grille(poste.niveau, d),
      id,
      f,
      couleur,
      poste.but,
    );
    Object.assign(p, { d, pole, poste, niveau: poste.niveau });
    this.persos.set(id, p);
    this.poser(p, this.cible(p, this.s.heure()));
    return p;
  }

  retirer(id) {
    const p = this.persos.get(id);
    if (!p) return;
    p.retire = true;
    p.g.parent?.remove(p.g);
    p.lab.element.remove();
    this.persos.delete(id);
  }

  // Pose sans marcher (arrivée au palier, mise en place au chargement).
  poser(p, c) {
    if (p.retire) return;
    this.s.tour.groupes[c.niveau].add(p.g);
    p.niveau = c.niveau;
    p.grille = p.visiteur
      ? this.grille("n0", VISITEUR)
      : this.grille(c.niveau, p.d);
    p.but = c.but;
    p.chemin = [];
    p.poser();
    p.dehors = !!c.dehors;
    p.g.visible = !c.dehors;
    p.cle = c;
  }

  // Où l'agent doit être maintenant : réunion ou poste s'il travaille, sinon le créneau de sa journée.
  cible(p, h) {
    if (p.actif) return p.reunion ?? p.poste;
    const c = creneau(h, p.id);
    if (c === "maison") return DEHORS;
    const l = c !== "poste" && lieu(c, p.id, h);
    if (!l) return p.poste;
    const ici = this.s.interieurs[l.niveau].lieux[l.piece]?.sieges;
    if (p.cle?.niveau === l.niveau && ici?.includes(p.cle.but)) return p.cle;
    return this.siege(l, p.id.length, p) ?? p.poste;
  }

  // Marche jusqu'à un but ; s'il est hors d'atteinte sur la grille, l'agent y est posé.
  rejoindre(p, but) {
    p.aller(but);
    if (!p.chemin.length && p.g.position.distanceTo(but.place) > 0.5) {
      p.but = but;
      p.poser();
    }
    return new Promise((fin) => (p.arrive = fin));
  }

  // Un trajet d'ascenseur à la fois : marcher au palier, appeler la cabine, disparaître, réapparaître en haut.
  async voyager(p, c) {
    const occupes = new Set(
      [...this.persos.values()].filter((q) => q.voyage).map((q) => q.voyage),
    );
    const trajet = itineraire(p.d, p.niveau, c.niveau, occupes);
    if (!trajet) return this.poser(p, c);
    for (const t of trajet) {
      p.voyage = t.asc;
      await this.rejoindre(p, debout(paliers(t.de)[t.asc]));
      const asc = this.s.tour.ascenseurs[t.asc];
      await asc.aller(t.de);
      p.g.visible = false;
      await asc.aller(t.vers);
      this.poser(p, { niveau: t.vers, but: debout(paliers(t.vers)[t.asc]) });
    }
    p.voyage = null;
    p.cle = null;
  }

  avancer(p, c) {
    if (p.voyage || c === p.cle) return;
    if (p.dehors && !c.dehors) this.poser(p, { niveau: "n0", but: PARVIS });
    if (c.niveau !== p.niveau) return this.voyager(p, c);
    p.cle = c;
    const fin = this.rejoindre(p, c.but);
    if (c.dehors) fin.then(() => p.cle === c && this.poser(p, c));
  }

  // Activité du flux : réunions de pôle (deux actifs ou plus), séance du board à Woodstock.
  maj(activite, seance) {
    const enSeance = new Set(seance);
    const poles = {};
    for (const [id, p] of this.persos) {
      if (p.visiteur) continue;
      const texte = activite.get(id);
      p.etat(texte != null, texte ?? "");
      p.reunion = null;
      if (p.actif && p.pole && !AU_POSTE.includes(id) && !enSeance.has(id))
        (poles[p.pole] ??= []).push(p);
    }
    if (enSeance.size)
      poles.board = seance
        .map((id) => this.persos.get(id))
        .filter((p) => p?.d.has("direction"));
    for (const [pole, membres] of Object.entries(poles)) {
      const salle = membres.length >= 2 && salleDe(pole);
      if (salle)
        membres.forEach((p, k) => (p.reunion = this.siege(salle, k, p)));
    }
    for (const p of this.persos.values()) {
      const ecran = p.poste?.but.ecran;
      if (ecran)
        ecran.material.emissiveIntensity = p.actif && !p.reunion ? 0.9 : 0.05;
    }
  }

  tick() {
    const h = this.s.heure();
    for (const p of this.persos.values())
      if (!p.visiteur) this.avancer(p, this.cible(p, h));
  }

  // Passants du café public : ils entrent par la rue, s'assoient, repartent, sans passer les portiques.
  visiteur(h) {
    if (h < 7 || h >= 23 || this.visiteurs >= 3) return;
    this.visiteurs++;
    const id = `visiteur#${Math.random().toString(36).slice(2, 7)}`;
    const p = new Perso(
      this.s.tour.groupes.n0,
      this.grille("n0", VISITEUR),
      id,
      { nom: "Client", role: "café" },
      "#94A3B8",
      TERRASSE,
    );
    p.visiteur = true;
    p.d = VISITEUR;
    this.persos.set(id, p);
    const place = this.siege(
      { niveau: "n0", piece: "cavern-club" },
      this.visiteurs,
      p,
    );
    if (!place) {
      this.visiteurs--;
      return this.retirer(id);
    }
    this.rejoindre(p, place.but)
      .then(
        () => new Promise((r) => setTimeout(r, 30e3 + Math.random() * 60e3)),
      )
      .then(() => this.rejoindre(p, TERRASSE))
      .then(() => {
        this.retirer(id);
        this.visiteurs--;
      });
  }

  animer(dt, t) {
    this.horloge -= dt;
    if (this.horloge < 0) {
      this.horloge = 1;
      this.tick();
    }
    this.prochainVisiteur -= dt;
    if (this.prochainVisiteur < 0) {
      this.prochainVisiteur = 15 + Math.random() * 30;
      this.visiteur(this.s.heure());
    }
    for (const p of this.persos.values()) {
      p.animer(dt, t);
      if (p.arrive && !p.chemin.length) {
        const fin = p.arrive;
        p.arrive = null;
        fin();
      }
    }
  }

  // Étiquettes des agents absents, en voyage ou hors du niveau regardé : masquées.
  etiquettes(choix) {
    for (const p of this.persos.values())
      if (
        !p.g.visible ||
        !p.g.parent?.visible ||
        (choix !== "ville" && p.niveau !== choix)
      )
        p.lab.element.style.display = "none";
  }

  presents() {
    const n = {};
    for (const p of this.persos.values())
      if (p.g.visible) n[p.niveau] = (n[p.niveau] ?? 0) + 1;
    return n;
  }
}
