// La foule de la tour : les PNJ arrivent par la rue, rejoignent leur place, repartent à la fin de leur service.
import * as THREE from "three";
import { Perso } from "../perso.js";
import { ROLES, droitsPnj, lieuPnj, presents } from "./pnj.js";
import { DEHORS } from "./vie.js";
import { CENTRE } from "./repere.js";

export class Foule {
  constructor(vie) {
    this.vie = vie;
    this.debut = true;
    this.places = new Map();
  }

  // Même objet pour une même place : la vie ne relance pas la marche à chaque seconde.
  place(cle, fabrique) {
    if (!this.places.has(cle)) this.places.set(cle, fabrique());
    return this.places.get(cle);
  }

  // Bureau, siège libre de la pièce, ou debout autour de son centre.
  cible(p, h) {
    const l = lieuPnj(p.pnj, p.k, h);
    const r = ROLES[p.pnj];
    p.actif = !!l.bureau || !!r.debout;
    if (l.bureau) {
      const b = l.bureau;
      return this.place(b, () => ({
        niveau: l.niveau,
        but: {
          place: new THREE.Vector3(b.place.x, 0, b.place.z),
          angle: b.angle,
        },
      }));
    }
    if (!r.debout) {
      const s = this.vie.siege(l, p.k, p);
      if (p.cle?.niveau === s?.niveau && p.cle?.but === s?.but) return p.cle;
      if (s) return s;
    }
    const salle = this.vie.s.interieurs[l.niveau].lieux[l.piece];
    return this.place(`${l.piece}|${p.k}`, () => {
      const a = p.k * 2.4;
      const d = 0.8 + (p.k % 3) * 0.6;
      const c = salle.centre;
      return {
        niveau: l.niveau,
        but: {
          place: new THREE.Vector3(
            c.x + Math.cos(a) * d,
            0,
            c.z + Math.sin(a) * d,
          ),
          angle: a + Math.PI / 2,
          debout: true,
        },
      };
    });
  }

  creer({ id, role, k }, h) {
    const d = droitsPnj(role, k);
    const v = this.vie;
    const p = new Perso(
      v.s.tour.groupes.n0,
      v.grille("n0", d),
      id,
      { nom: "", role, pnj: role },
      "#94A3B8",
      DEHORS.but,
    );
    Object.assign(p, { pnj: role, k, d, niveau: "n0" });
    v.persos.set(id, p);
    // Au chargement, chacun est déjà à sa place ; ensuite, on arrive par la rue.
    v.poser(p, this.debut ? this.cible(p, h) : DEHORS);
  }

  tick(h) {
    const voulus = new Map(
      presents(h, this.vie.s.jour()).map((x) => [x.id, x]),
    );
    for (const p of [...this.vie.persos.values()]) {
      if (!p.pnj) continue;
      if (voulus.has(p.id)) this.vie.avancer(p, this.cible(p, h));
      else if (p.dehors && !p.voyage) this.vie.retirer(p.id);
      else this.vie.avancer(p, DEHORS);
    }
    for (const [id, x] of voulus)
      if (!this.vie.persos.has(id)) this.creer(x, h);
    this.debut = false;
    this.ecrans(h);
  }

  // Écran du bureau allumé tant qu'un PNJ y est assis.
  ecrans(h) {
    const allumes = new Set();
    for (const p of this.vie.persos.values()) {
      const b = p.pnj && lieuPnj(p.pnj, p.k, h).bureau;
      const g = p.g.position;
      if (!b || p.voyage || Math.hypot(g.x - b.place.x, g.z - b.place.z) > 0.6)
        continue;
      const liste = this.vie.s.interieurs[p.niveau]?.ecrans ?? [];
      if (!liste.length) continue;
      const x = b.place.x + CENTRE.x;
      const y = b.place.z + CENTRE.y;
      const e = liste.reduce((a, c) =>
        Math.hypot(c.x - x, c.y - y) < Math.hypot(a.x - x, a.y - y) ? c : a,
      );
      if (e && Math.hypot(e.x - x, e.y - y) < 1.5) allumes.add(e.ecran);
    }
    for (const e of this.allumes ?? [])
      if (!allumes.has(e)) e.material.emissiveIntensity = 0.05;
    for (const e of allumes) e.material.emissiveIntensity = 0.9;
    this.allumes = allumes;
  }
}
