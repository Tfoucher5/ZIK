import * as THREE from "three";
import { etiquette } from "./meubles.js";

const PEAUX = ["#f1c7a5", "#d9a37e", "#a86f4c", "#6e4a33", "#f5d6bd"];
const CHEVEUX = [
  "#2b1d14",
  "#5a3a22",
  "#c9a063",
  "#111111",
  "#8a8a8a",
  "#a0522d",
];
const PANTALONS = ["#232a3a", "#3b3f46", "#2f3b52", "#4a3b2f", "#1d1f24"];
const VITESSE = 2.6;
const hasard = (t) => t[Math.floor(Math.random() * t.length)];

export class Perso {
  constructor(scene, grille, id, nom, couleur, siege) {
    Object.assign(this, {
      id,
      grille,
      siege,
      but: siege,
      chemin: [],
      assis: false,
      actif: false,
    });
    this.pause = 3 + Math.random() * 10;
    this.phase = Math.random() * 6;
    this.g = new THREE.Group();
    scene.add(this.g);
    const m = (c) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 });
    const haut = m(couleur);
    const peau = m(hasard(PEAUX));
    const corps = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.48, 4, 12),
      haut,
    );
    corps.position.y = 1.08;
    corps.scale.z = 0.75;
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), peau);
    tete.position.y = 1.66;
    const cheveux = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      m(hasard(CHEVEUX)),
    );
    cheveux.position.set(0, 1.69, -0.02);
    this.jambes = [-0.11, 0.11].map((x) =>
      this.membre(x, 0.72, 0.14, 0.72, m(hasard(PANTALONS)), 0.16),
    );
    this.bras = [-0.31, 0.31].map((x) =>
      this.membre(x, 1.36, 0.1, 0.56, haut, 0.11, peau),
    );
    for (const o of [corps, tete, cheveux]) {
      o.castShadow = true;
      o.userData.id = id;
      this.g.add(o);
    }
    this.cliquables = [corps, tete];
    this.lab = etiquette("", couleur, "etiquette repos");
    this.lab.element.innerHTML = `<div class="nom"></div><div class="act"></div>`;
    this.lab.element.querySelector(".nom").textContent = nom;
    this.act = this.lab.element.querySelector(".act");
    this.lab.position.y = 2.2;
    this.g.add(this.lab);
    this.poser();
  }

  membre(x, y, l, h, mat, p, main) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const b = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);
    b.position.y = -h / 2;
    b.castShadow = true;
    pivot.add(b);
    if (main) {
      const mn = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), main);
      mn.position.y = -h - 0.03;
      pivot.add(mn);
    }
    this.g.add(pivot);
    return pivot;
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

  // Au repos : alterne entre son poste et une pause (cuisine, salon, fenêtre).
  flaner(dt, pauses) {
    this.pause -= dt;
    if (this.pause > 0 || this.chemin.length) return;
    this.pause = 10 + Math.random() * 20;
    if (this.but === this.siege && Math.random() < 0.5) {
      const p = hasard(pauses);
      this.aller({
        place: p
          .clone()
          .add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5)),
        angle: Math.random() * 6,
        debout: true,
      });
    } else this.aller(this.siege);
  }

  animer(dt, t) {
    const jambe = (a) =>
      this.jambes.forEach((j, i) => (j.rotation.x = i ? -a : a));
    const bras = (a, b = a) =>
      this.bras.forEach((p, i) => (p.rotation.x = i ? b : a));
    const pas = this.chemin[0];
    if (pas) {
      const d = pas.clone().sub(this.g.position.clone().setY(0));
      const l = d.length();
      if (l < 0.05) {
        this.chemin.shift();
        if (!this.chemin.length) this.poser();
      } else {
        this.g.position
          .setY(0)
          .addScaledVector(d.normalize(), Math.min(l, VITESSE * dt));
        const cible = Math.atan2(d.x, d.z);
        const ecart = Math.atan2(
          Math.sin(cible - this.g.rotation.y),
          Math.cos(cible - this.g.rotation.y),
        );
        this.g.rotation.y += ecart * Math.min(1, dt * 10);
        const s = Math.sin(t * 9 + this.phase);
        jambe(s * 0.55);
        bras(-s * 0.5, s * 0.5);
        this.g.position.y = Math.abs(s) * 0.04;
        return;
      }
    }
    if (this.assis) {
      this.g.position.y = -0.24;
      jambe(-Math.PI / 2);
      const frappe = this.actif ? Math.sin(t * 16 + this.phase) * 0.1 : 0;
      bras(-1.15 + frappe, -1.15 - frappe);
    } else {
      this.g.position.y = 0;
      jambe(0);
      const geste = this.actif ? Math.sin(t * 2.5 + this.phase) * 0.5 : 0;
      bras(-0.15 - Math.max(geste, 0) * 1.6, -0.1 + Math.min(geste, 0) * 0.4);
    }
  }
}
