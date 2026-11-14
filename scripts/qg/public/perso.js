import * as THREE from "three";
import { etiquette } from "./meubles.js";

const PEAUX = [
  "#f1c7a5",
  "#d9a37e",
  "#a86f4c",
  "#6e4a33",
  "#f5d6bd",
  "#c68863",
];
const CHEVEUX = [
  "#2b1d14",
  "#5a3a22",
  "#c9a063",
  "#111111",
  "#8a6a4a",
  "#a0522d",
];
const HAUTS = [
  "#e2e8f0",
  "#1e293b",
  "#f59e0b",
  "#0ea5e9",
  "#a3e635",
  "#f472b6",
  "#64748b",
  "#fef3c7",
  "#7c3aed",
  "#14b8a6",
];
const BAS = ["#232a3a", "#3b3f46", "#2f3b52", "#4a3b2f", "#1d1f24", "#5b6b8a"];
const VITESSE = 1.4;
const hasard = (t) => t[Math.floor(Math.random() * t.length)];

// Tirage stable : une même personne garde le même look d'une ouverture à l'autre.
function tirage(graine) {
  let h = 2166136261;
  for (const c of graine) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (t, sel = 0) => t[((h >>> 0) + sel * 7919) % t.length];
}

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
    this.pause = 3 + Math.random() * 10;
    this.phase = Math.random() * 6;
    this.g = new THREE.Group();
    scene.add(this.g);
    const pick = tirage(f.nom + id);
    const m = (c) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 });
    const haut = m(f.haut ?? pick(HAUTS, 1));
    const peau = m(pick(PEAUX, 2));
    const cheveu = m(pick(CHEVEUX, 3));
    const corps = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.46, 4, 12),
      haut,
    );
    corps.position.y = 1.08;
    corps.scale.z = 0.72;
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), peau);
    tete.position.y = 1.6;
    const coupe = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      cheveu,
    );
    coupe.position.set(0, 1.62, -0.015);
    const pieces = [corps, tete, coupe];
    if (f.f) {
      const longs = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.32, 0.12),
        cheveu,
      );
      longs.position.set(0, 1.5, -0.1);
      pieces.push(longs);
    }
    if (f.l) {
      const lunettes = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.05, 0.02),
        m("#111"),
      );
      lunettes.position.set(0, 1.62, 0.145);
      pieces.push(lunettes);
    }
    const carte = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.1, 0.01),
      m(badge),
    );
    carte.position.set(0.1, 1.15, 0.165);
    pieces.push(carte);
    this.jambes = [-0.1, 0.1].map((x) =>
      this.membre(x, 0.72, 0.13, 0.72, m(pick(BAS, 4)), 0.15),
    );
    this.bras = [-0.28, 0.28].map((x) =>
      this.membre(x, 1.34, 0.09, 0.54, haut, 0.1, peau),
    );
    for (const o of pieces) {
      o.castShadow = true;
      o.userData.id = id;
      this.g.add(o);
    }
    this.cliquables = [corps, tete];
    this.lab = etiquette("", badge, "etiquette repos");
    this.lab.element.innerHTML = `<div class="nom"><b></b> <span></span></div><div class="act"></div>`;
    this.lab.element.querySelector("b").textContent = f.nom;
    this.lab.element.querySelector("span").textContent = f.role ?? "";
    this.act = this.lab.element.querySelector(".act");
    this.lab.position.y = 2.05;
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
