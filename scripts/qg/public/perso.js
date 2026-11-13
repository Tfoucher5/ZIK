import * as THREE from "three";
import { etiquette } from "./bureau.js";

const PEAUX = ["#f1c7a5", "#d9a37e", "#a86f4c", "#6e4a33", "#f5d6bd"];
const VITESSE = 3;

// Chemin depuis le couloir central (z = 0) jusqu'à un point du bureau.
function entree(p) {
  if (p.z < -12.5) {
    const v = [new THREE.Vector3(8, 0, 0), new THREE.Vector3(8, 0, -13.5)];
    if (Math.abs(p.x) < 6)
      v.push(
        new THREE.Vector3(0, 0, -13.5),
        new THREE.Vector3(0, 0, -17),
        new THREE.Vector3(p.x, 0, -17),
      );
    else v.push(new THREE.Vector3(p.x, 0, -13.5));
    return v;
  }
  if (Math.abs(p.x) < 6.5 && p.z < -4) {
    const cote = p.x < 0 ? -5.6 : 5.6;
    return [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -4.8),
      new THREE.Vector3(cote, 0, -4.8),
      new THREE.Vector3(cote, 0, p.z),
    ];
  }
  const allee = p.x + 1.7;
  return [new THREE.Vector3(allee, 0, 0), new THREE.Vector3(allee, 0, p.z)];
}

export class Perso {
  constructor(scene, id, nom, couleur, siege) {
    this.id = id;
    this.siege = siege;
    this.but = siege;
    this.chemin = [];
    this.assis = false;
    this.actif = false;
    this.pause = 2 + Math.random() * 8;
    this.phase = Math.random() * 6;
    this.g = new THREE.Group();
    this.g.position.copy(siege.place);
    this.g.rotation.y = siege.angle;
    scene.add(this.g);
    const m = (c) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 });
    const corps = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.27, 0.5, 4, 12),
      m(couleur),
    );
    corps.position.y = 1.08;
    const tete = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 16, 12),
      m(PEAUX[Math.floor(Math.random() * PEAUX.length)]),
    );
    tete.position.y = 1.7;
    this.jambes = [-0.12, 0.12].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.72, 0);
      const j = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.7, 0.17),
        m("#232a3a"),
      );
      j.position.y = -0.35;
      pivot.add(j);
      this.g.add(pivot);
      return pivot;
    });
    this.bras = [-0.34, 0.34].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.35, 0);
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.55, 0.12),
        m(couleur),
      );
      b.position.y = -0.27;
      pivot.add(b);
      this.g.add(pivot);
      return pivot;
    });
    for (const o of [corps, tete]) {
      o.castShadow = true;
      o.userData.id = id;
      this.g.add(o);
    }
    this.cliquables = [corps, tete];
    this.lab = etiquette("", couleur, "etiquette repos");
    this.lab.element.innerHTML = `<div class="nom"></div><div class="act"></div>`;
    this.lab.element.querySelector(".nom").textContent = nom;
    this.act = this.lab.element.querySelector(".act");
    this.lab.position.y = 2.3;
    this.g.add(this.lab);
    this.asseoir();
  }

  asseoir() {
    this.assis = true;
    this.g.position.copy(this.but.place);
    this.g.rotation.y = this.but.angle;
  }

  aller(but) {
    if (this.but === but && (this.assis || this.chemin.length)) return;
    const sortie = entree(this.g.position.clone().setY(0)).reverse();
    this.but = but;
    this.assis = false;
    this.chemin = [...sortie, ...entree(but.place), but.place.clone()];
  }

  etat(actif, texte) {
    this.actif = actif;
    this.lab.element.classList.toggle("repos", !actif);
    this.act.textContent = actif ? texte : "";
  }

  // Inactif : alterne entre son poste et une pause (café, salon, couloir).
  flaner(dt, pauses) {
    this.pause -= dt;
    if (this.pause > 0 || this.chemin.length) return;
    this.pause = 7 + Math.random() * 14;
    if (this.but === this.siege && Math.random() < 0.45) {
      const p = pauses[Math.floor(Math.random() * pauses.length)];
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
    const pas = this.chemin[0];
    const jambe = (a) =>
      this.jambes.forEach((j, i) => (j.rotation.x = i ? -a : a));
    const bras = (a, b = a) =>
      this.bras.forEach((p, i) => (p.rotation.x = i ? b : a));
    if (pas) {
      const d = pas.clone().sub(this.g.position);
      const l = d.length();
      if (l < 0.05) {
        this.chemin.shift();
        if (!this.chemin.length) {
          if (this.but.debout) this.g.rotation.y = this.but.angle;
          else this.asseoir();
        }
      } else {
        this.g.position.addScaledVector(
          d.normalize(),
          Math.min(l, VITESSE * dt),
        );
        this.g.rotation.y = Math.atan2(d.x, d.z);
        const s = Math.sin(t * 10 + this.phase) * 0.6;
        jambe(s);
        bras(-s * 0.7, s * 0.7);
        this.g.position.y = Math.abs(Math.sin(t * 10 + this.phase)) * 0.05;
        return;
      }
    }
    if (this.assis) {
      this.g.position.y = -0.22;
      jambe(-Math.PI / 2);
      const frappe = this.actif ? Math.sin(t * 18 + this.phase) * 0.12 : 0;
      bras(-1.1 + frappe, -1.1 - frappe);
    } else {
      this.g.position.y = 0;
      jambe(0);
      const geste = this.actif ? Math.sin(t * 3 + this.phase) * 0.4 : 0;
      bras(-0.2 - geste, -0.1);
    }
  }
}
