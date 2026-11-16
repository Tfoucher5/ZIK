import * as THREE from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { Camera } from "./camera.js";
import { Grille } from "./chemins.js";
import { COULEURS, plan } from "./plan.js";
import { contour } from "./batiment.js";
import { direction } from "./direction.js";
import { ETAGES, VILLE, cadrage, visibles } from "./etages.js";
import { deplacer } from "./mouvements.js";
import { fiche } from "./noms.js";
import { penthouse } from "./penthouse.js";
import { Perso } from "./perso.js";
import { animerPortes, oublierPortes } from "./portes.js";
import { Recrutement } from "./recrutement.js";
import { creerRendu } from "./rendu.js";
import { ville } from "./ville.js";

export class Scene3D {
  constructor(conteneur, surClic) {
    this.conteneur = conteneur;
    this.persos = new Map();
    this.choix = 0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
    this.rendu = new THREE.WebGLRenderer({ antialias: true });
    this.rendu.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.rendu.shadowMap.enabled = true;
    this.rendu.shadowMap.type = THREE.PCFSoftShadowMap;
    this.rendu.domElement.style.display = "block";
    if (getComputedStyle(conteneur).position === "static")
      conteneur.style.position = "relative";
    conteneur.appendChild(this.rendu.domElement);
    this.etiquettes = new CSS2DRenderer();
    Object.assign(this.etiquettes.domElement.style, {
      position: "absolute",
      top: "0",
      left: "0",
      pointerEvents: "none",
    });
    conteneur.appendChild(this.etiquettes.domElement);
    this.post = creerRendu(this.rendu, this.scene, this.camera);
    this.vue = new Camera(this.camera, this.rendu.domElement);
    this.ciel = new THREE.HemisphereLight("#dbe8ff", "#3a3328", 1);
    this.soleil = new THREE.DirectionalLight("#fff1dc", 2);
    this.soleil.position.set(10, 26, 14);
    this.soleil.castShadow = true;
    this.soleil.shadow.mapSize.set(2048, 2048);
    this.soleil.shadow.bias = -0.0005;
    this.scene.add(this.ciel, this.soleil);
    this.ambiance();
    setInterval(() => this.ambiance(), 60000);
    const rayon = new THREE.Raycaster();
    this.rendu.domElement.addEventListener("click", (e) => {
      const r = this.rendu.domElement.getBoundingClientRect();
      rayon.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1,
        ),
        this.camera,
      );
      const visibles = [...this.persos.values()].filter(
        (p) => p.g.parent?.visible,
      );
      const id = rayon.intersectObjects(
        visibles.flatMap((x) => x.cliquables),
      )[0]?.object.userData.id;
      surClic(id ? id.split("#")[0] : null);
    });
    new ResizeObserver(() => this.taille()).observe(conteneur);
    this.taille();
    this.equipe = new Recrutement(this);
    this.horloge = new THREE.Clock();
    this.rendu.setAnimationLoop(() => this.image());
  }

  // La scène occupe son conteneur, pas l'écran : le tableau de bord peut l'entourer ou se masquer.
  taille() {
    const l = this.conteneur.clientWidth || innerWidth;
    const h = this.conteneur.clientHeight || innerHeight;
    this.camera.aspect = l / h;
    this.camera.updateProjectionMatrix();
    this.rendu.setSize(l, h);
    this.post.taille(l, h);
    this.etiquettes.setSize(l, h);
    if (this.vue.cadre) this.vue.cadrer(this.vue.cadre, false);
  }

  // Jour ou nuit selon l'heure du PC.
  ambiance() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const jour = h > 7.5 && h < 18.5;
    this.ciel.intensity = jour ? 1.1 : 0.55;
    this.soleil.intensity = jour ? 2.2 : 0.5;
    this.soleil.color.set(jour ? "#fff1dc" : "#9fb4ff");
    this.post.nuit(!jour);
  }

  // Ancienne entrée : l'organigramme du CLAUDE.md, gardé en repli tant que /agents n'existe pas.
  construire(org) {
    this.equipe.repli(org);
  }

  // Monte la tour pour une disposition du Plateau (place des pôles, bord ouest) ; l'ancienne est retirée.
  monter(disposition, limites) {
    this.vider();
    const premier = !this.d;
    this.groupes = ETAGES.map((e) => {
      const g = new THREE.Group();
      g.position.y = e.y;
      this.scene.add(g);
      return g;
    });
    const [bas, milieu, haut] = this.groupes;
    this.grille = new Grille(...limites);
    this.d = plan(bas, this.grille, disposition);
    this.ville = ville(this.scene, { contour: contour(disposition.ouest) });
    const grilleDir = new Grille(...ETAGES[1].bornes);
    this.dir = direction(milieu, grilleDir);
    const grillePent = new Grille(...ETAGES[2].bornes);
    this.pent = penthouse(haut, grillePent);
    if (this.dernier) this.pent.maj(this.dernier);
    this.niveaux = {
      plateau: { groupe: bas, grille: this.grille, ...this.d },
      direction: { groupe: milieu, grille: grilleDir, ...this.dir },
      penthouse: { groupe: haut, grille: grillePent, ...this.pent },
    };
    const r = Math.max(26, 4 - disposition.ouest);
    Object.assign(this.soleil.shadow.camera, {
      left: -r,
      right: r,
      top: 18,
      bottom: -18,
      far: 90,
    });
    this.soleil.shadow.camera.updateProjectionMatrix();
    this.bornes = [limites[0], limites[1], limites[2], limites[3]];
    this.couper();
    this.vue.cadrer(cadrage(this.choix, this.bornes).bornes, premier);
    this.perso("theo", undefined, "#ffffff", this.pent.theo, null, "penthouse");
    this.perso("accueil", undefined, "#ff00ff", this.d.accueil).fixe = true;
    this.perso("ceo", undefined, COULEURS.ceo, this.dir.ceo, null, "direction");
    for (const [id, s] of Object.entries(this.dir.chefs))
      this.perso(id, undefined, COULEURS[id], s, null, "direction");
  }

  couper() {
    const vis = visibles(this.choix);
    this.groupes?.forEach((g, i) => (g.visible = vis[i]));
  }

  // Ascenseur : 0 Plateau, 1 Direction, 2 Penthouse, "ville" toute la tour.
  voir(choix) {
    this.choix = choix;
    this.couper();
    if (!this.bornes) return;
    const c = cadrage(choix, this.bornes);
    this.vue.voler(c.bornes, c.y, c.recul);
  }

  // Données du tableau de bord affichées dans le penthouse.
  donnees(d) {
    this.dernier = d;
    this.pent?.maj(d);
  }

  vider() {
    if (!this.d) return;
    oublierPortes();
    this.scene.traverse((o) => o.element?.remove());
    for (const o of [...this.scene.children]) {
      if (o === this.ciel || o === this.soleil || o.userData.garder) continue;
      o.traverse((x) => x.geometry?.dispose());
      this.scene.remove(o);
    }
    this.persos.clear();
  }

  // role et nom remplacent ceux de noms.js quand /agents les donne.
  perso(id, role, couleur, siege, nom, niveau = "plateau") {
    const base = fiche(id, role ?? id);
    const f = { ...base, ...(nom && { nom }), ...(role && { role }) };
    const n = this.niveaux[niveau];
    const p = new Perso(n.groupe, n.grille, id, f, couleur, siege);
    p.niveau = niveau;
    this.persos.set(id, p);
    return p;
  }

  retirer(id) {
    const p = this.persos.get(id);
    if (!p) return;
    p.g.parent?.remove(p.g);
    p.lab.element.remove();
    this.persos.delete(id);
  }

  maj(activite, nb, seance) {
    if (this.d) deplacer(this, activite, nb, seance);
  }

  image() {
    const dt = Math.min(this.horloge.getDelta(), 0.25);
    const t = this.horloge.elapsedTime;
    this.vue.maj(dt);
    this.ville?.animer(dt, t);
    if (this.d) {
      const prises = new Set([...this.persos.values()].map((p) => p.but));
      for (const [id, p] of this.persos) {
        if (p.arrivee > 0) p.arrivee -= dt;
        if (!p.actif && !p.temporaire && !p.fixe)
          p.flaner(
            dt,
            this.niveaux[p.niveau].pauses.filter((x) => !prises.has(x)),
          );
        p.animer(dt, t);
        if (p.depart && !p.chemin.length) this.retirer(id);
      }
      animerPortes(
        dt,
        [...this.persos.values()].map((p) =>
          p.g.position.clone().setY(p.g.parent?.position.y ?? 0),
        ),
      );
      for (const s of Object.values(this.d.services)) s.salle.tele.animer(dt);
      this.dir.board.tele.animer(dt);
      this.pent.animer(dt, t);
    }
    this.post.render();
    this.etiquettes.render(this.scene, this.camera);
    for (const [i, g] of (this.groupes ?? []).entries())
      if (!g.visible || this.choix === VILLE || i !== this.choix)
        g.traverse((o) => {
          if (o.isCSS2DObject) o.element.style.display = "none";
        });
  }
}
