import * as THREE from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { Camera } from "./camera.js";
import { animerPortes } from "./portes.js";
import { VILLE, cadrage } from "./etages.js";
import { COULEURS } from "./noms.js";
import { Recrutement } from "./recrutement.js";
import { creerRendu } from "./rendu.js";
import { NIVEAUX, TRAME } from "./tour/plan.js";
import { interieur } from "./tour3d/interieur.js";
import { fenetresAllumees, heureDuPc, soleil } from "./tour3d/lumiere.js";
import { structure } from "./tour3d/structure.js";
import { Vie } from "./tour3d/vie.js";
import { ville } from "./ville.js";

const [L, P] = [TRAME.largeur / 2, TRAME.profondeur / 2];
const EMPRISE = [
  [-L, -P],
  [L, -P],
  [L, P],
  [-L, P],
];

export class Scene3D {
  constructor(conteneur, surClic) {
    this.conteneur = conteneur;
    this.choix = VILLE;
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
    this.soleil.castShadow = true;
    this.soleil.shadow.mapSize.set(2048, 2048);
    this.soleil.shadow.bias = -0.0005;
    Object.assign(this.soleil.shadow.camera, {
      left: -32,
      right: 32,
      top: 32,
      bottom: -32,
      far: 160,
    });
    this.scene.add(this.ciel, this.soleil, this.soleil.target);

    this.tour = structure(this.scene);
    this.interieurs = Object.fromEntries(
      NIVEAUX.map((n) => [n.id, interieur(this.tour.groupes[n.id], n)]),
    );
    this.noms = NIVEAUX.map((n) => {
      const liste = [];
      this.tour.groupes[n.id].traverse((o) => o.isCSS2DObject && liste.push(o));
      return [n.id, liste];
    });
    this.ville = ville(this.scene, { contour: EMPRISE, hauteurTour: 38 });
    this.vie = new Vie(this);
    this.vie.ajouter("theo", undefined, undefined, "#ffffff");
    this.vie.ajouter("accueil", undefined, undefined, "#ff00ff");
    this.vie.ajouter("ceo", undefined, undefined, COULEURS.ceo);
    for (const id of ["tech", "operations", "argent", "produit", "marketing"])
      this.vie.ajouter(id, undefined, undefined, COULEURS[id]);
    this.lumiere();

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
      const visibles = [...this.vie.persos.values()].filter(
        (p) => !p.visiteur && p.g.visible && p.g.parent?.visible,
      );
      const id = rayon.intersectObjects(
        visibles.flatMap((x) => x.cliquables),
      )[0]?.object.userData.id;
      surClic(id ? id.split("#")[0] : null);
    });
    new ResizeObserver(() => this.taille()).observe(conteneur);
    this.taille();
    const c = cadrage(VILLE);
    this.vue.y = c.y;
    this.vue.cadrer(c.bornes);
    this.vue.voler(c.bornes, c.y, c.recul);
    this.tour.coupe(VILLE);
    this.equipe = new Recrutement(this.vie);
    this.horloge = new THREE.Clock();
    this.prochaineLumiere = 0;
    this.rendu.setAnimationLoop(() => this.image());
  }

  heure() {
    return heureDuPc();
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

  // Soleil, ciel, fenêtres et lampadaires à l'heure du PC.
  lumiere() {
    const h = this.heure();
    const s = soleil(h);
    this.soleil.position.set(s.position.x, s.position.y, s.position.z);
    this.soleil.position.multiplyScalar(60).add(new THREE.Vector3(0, 14, 0));
    this.soleil.target.position.set(0, 14, 0);
    this.soleil.color.set(s.couleur);
    this.soleil.intensity = s.intensite;
    this.ciel.intensity = s.ciel;
    this.post.nuit(s.nuit);
    this.ville.lampes(s.nuit > 0.5);
    const presents = this.vie.presents();
    for (const n of NIVEAUX)
      this.tour.fenetres(n.id, fenetresAllumees(h, presents[n.id] ?? 0));
  }

  // Ancienne entrée : l'organigramme du CLAUDE.md, gardé en repli tant que /agents n'existe pas.
  construire(org) {
    this.equipe.repli(org);
  }

  // Ascenseur du QG : un id de niveau ou « ville » (toute la tour).
  voir(choix) {
    this.choix = choix;
    this.tour.coupe(choix);
    this.ville.groupe.visible = choix !== "ss";
    const c = cadrage(choix);
    this.vue.voler(c.bornes, c.y, c.recul);
  }

  maj(activite, nb, seance) {
    this.vie.maj(activite, seance);
  }

  image() {
    const dt = Math.min(this.horloge.getDelta(), 0.25);
    const t = this.horloge.elapsedTime;
    this.prochaineLumiere -= dt;
    if (this.prochaineLumiere < 0) {
      this.prochaineLumiere = 5;
      this.lumiere();
    }
    this.vue.maj(dt);
    this.ville.animer(dt, t);
    this.tour.animer(dt, t);
    for (const i of Object.values(this.interieurs)) i.animer(dt, t);
    this.vie.animer(dt, t);
    animerPortes(
      dt,
      [...this.vie.persos.values()]
        .filter((p) => p.g.visible)
        .map((p) => p.g.position.clone().setY(p.g.parent?.position.y ?? 0)),
    );
    this.post.render();
    this.etiquettes.render(this.scene, this.camera);
    this.vie.etiquettes(this.choix);
    for (const [id, liste] of this.noms)
      if (id !== this.choix)
        for (const o of liste) o.element.style.display = "none";
  }
}
