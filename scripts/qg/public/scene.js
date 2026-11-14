import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { Grille } from "./chemins.js";
import { COULEURS, LIMITES, plan } from "./plan.js";
import { Perso } from "./perso.js";

// Ces métiers restent à leur poste ; les autres se réunissent en salle dès qu'ils sont deux du même service.
const AU_POSTE = ["dev", "test-writer", "reviewer", "recette", "incident"];

export class Scene3D {
  constructor(conteneur, surClic) {
    this.persos = new Map();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      42,
      innerWidth / innerHeight,
      0.1,
      500,
    );
    const loin = innerWidth < 700 ? 1.9 : 1;
    this.camera.position.set(innerWidth < 700 ? 0 : 9, 86 * loin, 72 * loin);
    this.rendu = new THREE.WebGLRenderer({ antialias: true });
    this.rendu.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.rendu.setSize(innerWidth, innerHeight);
    this.rendu.shadowMap.enabled = true;
    this.rendu.shadowMap.type = THREE.PCFSoftShadowMap;
    conteneur.appendChild(this.rendu.domElement);
    this.etiquettes = new CSS2DRenderer();
    this.etiquettes.setSize(innerWidth, innerHeight);
    Object.assign(this.etiquettes.domElement.style, {
      position: "absolute",
      top: "0",
      pointerEvents: "none",
    });
    conteneur.appendChild(this.etiquettes.domElement);
    this.controles = new OrbitControls(this.camera, this.rendu.domElement);
    this.controles.target.set(innerWidth < 700 ? 0 : 9, 0, 4);
    this.controles.enableDamping = true;
    this.controles.maxPolarAngle = Math.PI / 2.3;
    this.controles.minDistance = 6;
    this.controles.maxDistance = 150;
    this.ciel = new THREE.HemisphereLight("#dbe8ff", "#3a3328", 1);
    this.soleil = new THREE.DirectionalLight("#fff1dc", 2);
    this.soleil.position.set(30, 45, 20);
    this.soleil.castShadow = true;
    this.soleil.shadow.mapSize.set(2048, 2048);
    this.soleil.shadow.bias = -0.0005;
    Object.assign(this.soleil.shadow.camera, {
      left: -45,
      right: 45,
      top: 35,
      bottom: -35,
      far: 150,
    });
    this.scene.add(this.ciel, this.soleil);
    this.ambiance();
    setInterval(() => this.ambiance(), 60000);
    const rayon = new THREE.Raycaster();
    this.rendu.domElement.addEventListener("click", (e) => {
      rayon.setFromCamera(
        new THREE.Vector2(
          (e.clientX / innerWidth) * 2 - 1,
          -(e.clientY / innerHeight) * 2 + 1,
        ),
        this.camera,
      );
      const id = rayon.intersectObjects(
        [...this.persos.values()].flatMap((x) => x.cliquables),
      )[0]?.object.userData.id;
      surClic(id ? id.split("#")[0] : null);
    });
    addEventListener("resize", () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.rendu.setSize(innerWidth, innerHeight);
      this.etiquettes.setSize(innerWidth, innerHeight);
    });
    this.horloge = new THREE.Clock();
    this.rendu.setAnimationLoop(() => this.image());
  }

  // Jour ou nuit selon l'heure du PC.
  ambiance() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const jour = h > 7.5 && h < 18.5;
    this.scene.background = new THREE.Color(jour ? "#9ec9ef" : "#0b1224");
    this.scene.fog = new THREE.Fog(this.scene.background, 120, 260);
    this.ciel.intensity = jour ? 1.1 : 0.55;
    this.soleil.intensity = jour ? 2.2 : 0.5;
    this.soleil.color.set(jour ? "#fff1dc" : "#9fb4ff");
  }

  perso(id, nom, couleur, siege) {
    const p = new Perso(this.scene, this.grille, id, nom, couleur, siege);
    this.persos.set(id, p);
    return p;
  }

  construire(org) {
    this.org = org;
    this.grille = new Grille(...LIMITES);
    this.d = plan(this.scene, this.grille, org);
    this.perso("theo", "Théo", "#f4f4f4", this.d.theo);
    this.perso("ceo", "CEO", COULEURS.ceo, this.d.ceo);
    this.libres = new Map([["renforts", this.d.renforts]]);
    for (const [id, s] of Object.entries(this.d.services)) {
      const c = org.chefs.find((x) => x.id === id);
      this.perso(id, `chef ${c.skill}`, COULEURS[id], s.chef);
      c.equipe.forEach((m, i) => this.perso(m, m, COULEURS[id], s.postes[i]));
      this.libres.set(id, s.postes.slice(c.equipe.length));
    }
    for (const b of org.board.filter(
      (x) => !x.includes("*") && !this.persos.has(x),
    ))
      this.perso(
        b,
        b,
        COULEURS.board,
        b === "avocat" ? this.d.avocat : this.d.invite,
      );
  }

  service(id) {
    return id === "renforts"
      ? "renforts"
      : this.org.chefs.find((c) => c.equipe.includes(id) || c.id === id)?.id;
  }

  // Copies d'un agent lancé plusieurs fois : elles sortent de l'ascenseur, prennent un poste libre et repartent.
  clones(id, n) {
    const libres = this.libres.get(this.service(id)) ?? [];
    const voulus = id === "renforts" ? n : n - 1;
    const asc = { place: this.d.ascenseur, angle: 0, debout: true };
    for (let i = 0; i < libres.length; i++) {
      const cle = `${id}#${i + 2}`;
      let p = this.persos.get(cle);
      if (i < voulus && !p) {
        p = this.perso(
          cle,
          id === "renforts" ? "renfort" : id,
          COULEURS[this.service(id)],
          asc,
        );
        p.siege = libres[i];
        p.temporaire = true;
      }
      if (!p) continue;
      p.voulu = i < voulus;
      p.depart = !p.voulu;
      p.aller(p.voulu ? libres[i] : asc);
    }
  }

  maj(activite, nb, seance) {
    const multiples = new Set(
      [...nb.keys()].filter((id) => id !== "theo" && id !== "ceo"),
    );
    for (const [id, p] of this.persos)
      if (p.temporaire) multiples.add(id.split("#")[0]);
    for (const id of multiples) this.clones(id, nb.get(id) ?? 0);
    const enSeance = new Set(seance);
    const reunions = new Map();
    for (const [id, s] of Object.entries(this.d.services)) {
      const c = this.org.chefs.find((x) => x.id === id);
      const membres = c.equipe.filter(
        (m) => activite.has(m) && !AU_POSTE.includes(m) && !enSeance.has(m),
      );
      if (membres.length >= 2) reunions.set(id, { salle: s.salle, membres });
      s.salle.ecran.material.emissiveIntensity = membres.length >= 2 ? 1 : 0.05;
    }
    const salleDe = (m) =>
      [...reunions.values()].find((r) => r.membres.includes(m));
    let siege = 0;
    for (const [id, p] of this.persos) {
      const base = id.split("#")[0];
      const texte = activite.get(base);
      const actif = p.temporaire ? p.voulu : texte != null;
      if (p.actif && !actif) p.pause = 1 + Math.random() * 4;
      p.etat(actif, texte ?? "");
      const ecran = p.siege.ecran;
      if (p.temporaire) {
        if (ecran) ecran.material.emissiveIntensity = p.voulu ? 0.9 : 0.05;
        continue;
      }
      let but = actif ? p.siege : null;
      const r = salleDe(id);
      if (enSeance.has(id) && actif && siege < this.d.board.sieges.length)
        but = this.d.board.sieges[siege++];
      else if (id === "ceo" && enSeance.size) but = this.d.board.debout;
      else if (r) but = r.salle.sieges[r.membres.indexOf(id)];
      else if (reunions.has(id) && actif) but = reunions.get(id).salle.debout;
      else if (actif && texte.startsWith("pilote ")) {
        const cible = this.persos.get(texte.slice(7).split(" ")[0]);
        if (cible && !salleDe(cible.id))
          but = {
            place: cible.siege.place
              .clone()
              .add(new THREE.Vector3(0.7, 0, 0.7)),
            angle: cible.siege.angle + 0.9,
            debout: true,
          };
      }
      if (but) p.aller(but);
      if (ecran)
        ecran.material.emissiveIntensity =
          actif && but === p.siege ? 0.9 : 0.05;
    }
    this.d.board.ecran.material.emissiveIntensity = siege ? 1 : 0.05;
  }

  image() {
    const dt = Math.min(this.horloge.getDelta(), 0.25);
    const t = this.horloge.elapsedTime;
    for (const [id, p] of this.persos) {
      if (!p.actif && !p.temporaire) p.flaner(dt, this.d.pauses);
      p.animer(dt, t);
      if (p.depart && !p.chemin.length) {
        this.scene.remove(p.g);
        p.lab.element.remove();
        this.persos.delete(id);
      }
    }
    this.controles.update();
    this.rendu.render(this.scene, this.camera);
    this.etiquettes.render(this.scene, this.camera);
  }
}
