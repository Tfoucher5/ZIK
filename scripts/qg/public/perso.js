import * as THREE from "three";
import { etiquette } from "./meubles.js";
import { construire } from "./perso-corps.js";
import { tenue } from "./perso-tenue.js";

const VITESSE = 1.4;
const vers = (a, b, k) => a + (b - a) * k;

export class Perso {
  constructor(scene, grille, id, f, badge, siege) {
    Object.assign(this, {
      id,
      grille,
      siege,
      but: siege,
      chemin: [],
      assis: false,
      actif: false,
    });
    this.phase = Math.random() * 6;
    this.g = new THREE.Group();
    scene.add(this.g);
    const t = tenue(f, id, badge);
    this.taille = t.taille;
    this.j = construire(t, badge, id);
    this.g.add(this.j.racine);
    if (this.j.aura) this.g.add(this.j.aura);
    this.cliquables = this.j.cliquables;
    this.ombre = true;
    this.lab = null;
    if (!f.pnj) this.etiquette(f, t, badge);
    this.poser();
  }

  etiquette(f, t, badge) {
    const rang = { fondateur: " fondateur", chef: " chef" }[t.rang] ?? "";
    this.lab = etiquette("", badge, `etiquette repos${rang}`);
    this.lab.element.innerHTML = `<div class="nom"><b></b> <span></span></div><div class="act"></div>`;
    this.lab.element.querySelector("b").textContent = f.nom;
    this.lab.element.querySelector("span").textContent = f.role ?? "";
    this.act = this.lab.element.querySelector(".act");
    this.lab.position.y = 2.05 * t.taille;
    this.g.add(this.lab);
  }

  // Ombres portées seulement sur l'étage regardé.
  ombrer(oui) {
    if (this.ombre === oui) return;
    this.ombre = oui;
    this.g.traverse((o) => o.isMesh && (o.castShadow = oui));
  }

  poser() {
    this.assis = !this.but.debout;
    this.g.position.copy(this.but.place);
    this.g.rotation.y = this.but.angle;
  }

  aller(but) {
    if (
      this.but === but &&
      (this.chemin.length || this.g.position.distanceTo(but.place) < 0.3)
    )
      return;
    this.but = but;
    this.assis = false;
    this.chemin = this.grille
      .trajet(this.g.position, but.place)
      .map((p) => new THREE.Vector3(p.x, 0, p.z));
  }

  etat(actif, texte) {
    this.actif = actif;
    this.lab.element.classList.toggle("repos", !actif);
    this.act.textContent = actif ? texte : "";
  }

  // Avance d'un pas vers le prochain point du chemin ; vrai si le perso marche.
  marcher(dt) {
    const pas = this.chemin[0];
    if (!pas) return false;
    const pos = this.g.position;
    const d = new THREE.Vector3(pas.x - pos.x, 0, pas.z - pos.z);
    const l = d.length();
    if (l < 0.05) {
      this.chemin.shift();
      if (!this.chemin.length) this.poser();
      return this.chemin.length > 0;
    }
    d.normalize().multiplyScalar(Math.min(l, VITESSE * dt));
    pos.x += d.x;
    pos.z += d.z;
    const cible = Math.atan2(d.x, d.z);
    const r = this.g.rotation;
    r.y +=
      Math.atan2(Math.sin(cible - r.y), Math.cos(cible - r.y)) *
      Math.min(1, dt * 10);
    return true;
  }

  pose(t, marche) {
    const p = this.phase;
    const o = {
      y: 0,
      buste: 0,
      teteX: Math.sin(t * 0.9 + p * 2) * 0.04,
      teteY: Math.sin(t * 0.37 + p) * Math.sin(t * 0.11 + p) * 0.5,
      hanche: [0, 0],
      genou: [0, 0],
      epaule: [0.04, 0.04],
      coude: [-0.12, -0.12],
    };
    if (marche) {
      const s = Math.sin(t * 9 + p);
      const c = Math.cos(t * 9 + p);
      o.y = Math.abs(c) * 0.035;
      o.buste = 0.06;
      o.teteY = 0;
      o.hanche = [s * 0.55, -s * 0.55];
      o.genou = [0.1 + Math.max(0, -c) * 0.8, 0.1 + Math.max(0, c) * 0.8];
      o.epaule = [-s * 0.5, s * 0.5];
      o.coude = [-0.35, -0.35];
    } else if (this.assis) {
      o.y = 0.53 - 0.72 * this.taille;
      o.hanche = [-1.4, -1.4];
      o.genou = [1.25, 1.25];
      if (this.actif) {
        const a = Math.sin(t * 17 + p) * 0.06;
        const b = Math.sin(t * 19 + p + 1.3) * 0.06;
        o.buste = 0.14;
        o.teteX = 0.12 + Math.sin(t * 0.7 + p) * 0.03;
        o.teteY = Math.sin(t * 0.31 + p) * 0.12;
        o.epaule = [-0.95 + a, -0.95 + b];
        o.coude = [-0.75 + Math.sin(t * 23 + p) * 0.1, -0.75 - b];
      } else {
        o.buste = -0.06;
        o.epaule = [-0.45, -0.45];
        o.coude = [-1, -1];
      }
    } else if (this.actif) {
      const g = Math.sin(t * 2.5 + p) * 0.5;
      o.teteX += Math.max(0, Math.sin(t * 3 + p)) * 0.12;
      o.epaule = [-0.2 - Math.max(g, 0) * 1.4, -0.1 + Math.min(g, 0) * 0.6];
      o.coude = [-0.5 - Math.max(g, 0) * 0.7, -0.4];
    }
    return o;
  }

  animer(dt, t) {
    const marche = this.marcher(dt);
    const o = this.pose(t, marche);
    const k = Math.min(1, dt * (marche ? 20 : 7));
    const j = this.j;
    const x = (n, v) => (n.rotation.x = vers(n.rotation.x, v, k));
    this.g.position.y = vers(this.g.position.y, o.y, k);
    x(j.buste, o.buste);
    x(j.tete, o.teteX);
    j.tete.rotation.y = vers(j.tete.rotation.y, o.teteY, k);
    for (const i of [0, 1]) {
      x(j.hanches[i], o.hanche[i]);
      x(j.genoux[i], o.genou[i]);
      x(j.epaules[i], o.epaule[i]);
      x(j.coudes[i], o.coude[i]);
    }
    j.buste.scale.y = 1 + Math.sin(t * 1.7 + this.phase) * 0.012;
    if (j.aura) {
      j.aura.position.y = 0.015 - this.g.position.y;
      j.aura.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    }
  }
}
