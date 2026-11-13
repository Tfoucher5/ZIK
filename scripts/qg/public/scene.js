import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { COULEURS, decor, service } from "./bureau.js";
import { Perso } from "./perso.js";

const RENFORTS_MAX = 4;
const PORTE = new THREE.Vector3(0, 0, 24);

export class Scene3D {
  constructor(conteneur, surClic) {
    this.persos = new Map();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0a0d14");
    this.scene.fog = new THREE.Fog("#0a0d14", 60, 120);
    this.camera = new THREE.PerspectiveCamera(
      45,
      innerWidth / innerHeight,
      0.1,
      300,
    );
    const loin = innerWidth < 700 ? 2 : 1;
    this.camera.position.set(5, 40 * loin, 44 * loin);
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
    this.controles.target.set(innerWidth < 700 ? 0 : 5, 0, 0);
    this.controles.enableDamping = true;
    this.controles.maxPolarAngle = Math.PI / 2.2;
    this.controles.minDistance = 8;
    this.controles.maxDistance = 120;
    this.scene.add(new THREE.HemisphereLight("#cfe0ff", "#1a1f2b", 1.1));
    const soleil = new THREE.DirectionalLight("#fff4e0", 1.6);
    soleil.position.set(18, 30, 14);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(2048, 2048);
    Object.assign(soleil.shadow.camera, {
      left: -36,
      right: 36,
      top: 30,
      bottom: -30,
    });
    this.scene.add(soleil);
    const rayon = new THREE.Raycaster();
    this.rendu.domElement.addEventListener("click", (e) => {
      const p = new THREE.Vector2(
        (e.clientX / innerWidth) * 2 - 1,
        -(e.clientY / innerHeight) * 2 + 1,
      );
      rayon.setFromCamera(p, this.camera);
      const objets = [...this.persos.values()].flatMap((x) => x.cliquables);
      const id = rayon.intersectObjects(objets)[0]?.object.userData.id;
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

  perso(id, nom, couleur, siege) {
    const p = new Perso(this.scene, id, nom, couleur, siege);
    this.persos.set(id, p);
    return p;
  }

  construire(org) {
    const d = decor(this.scene);
    this.d = d;
    this.ecrans = new Map();
    this.perso("theo", "Théo", "#ffffff", d.theo);
    this.perso("ceo", "CEO", COULEURS.ceo, d.ceo);
    this.ecrans.set("theo", d.theo.ecran).set("ceo", d.ceo.ecran);
    this.libres = new Map();
    for (const c of org.chefs.filter((x) => x.id !== "ceo")) {
      const s = service(
        this.scene,
        c.id,
        c.nom.replace(/ \(.*\)/, ""),
        c.equipe,
      );
      this.perso(c.id, `chef ${c.skill}`, COULEURS[c.id], s.chef);
      this.ecrans.set(c.id, s.chef.ecran);
      c.equipe.forEach((m, i) => {
        this.perso(m, m, COULEURS[c.id], s.postes[i]);
        this.ecrans.set(m, s.postes[i].ecran);
      });
      this.libres.set(c.id, s.postes.slice(c.equipe.length));
    }
    const r = service(this.scene, "renforts", "Renforts", [], RENFORTS_MAX - 1);
    this.libres.set("renforts", [r.chef, ...r.postes]);
    for (const b of org.board.filter(
      (x) => !x.includes("*") && !this.persos.has(x),
    )) {
      const siege = b === "avocat" ? d.avocat : d.invite;
      this.perso(b, b, COULEURS.board, siege);
      if (siege.ecran) this.ecrans.set(b, siege.ecran);
    }
    this.org = org;
  }

  chefDe(id) {
    return this.org.chefs.find((c) => c.equipe.includes(id))?.id;
  }

  // Copies d'un agent lancé plusieurs fois, sur les postes libres de son service.
  clones(id, n) {
    const service = id === "renforts" ? "renforts" : this.chefDe(id);
    const libres = this.libres.get(service) ?? [];
    const voulus = id === "renforts" ? n : n - 1;
    for (let i = 0; i < libres.length; i++) {
      const cle = `${id}#${i + 2}`;
      let p = this.persos.get(cle);
      if (i < voulus && !p) {
        p = this.perso(
          cle,
          id === "renforts" ? "renfort" : id,
          COULEURS[service],
          libres[i],
        );
        p.g.position.copy(PORTE);
        p.assis = false;
        p.but = { place: PORTE };
        p.temporaire = true;
        p.ecran = libres[i].ecran;
      }
      if (!p) continue;
      p.voulu = i < voulus;
      if (p.voulu) {
        p.depart = false;
        p.aller(libres[i]);
      } else if (!p.depart) {
        p.depart = true;
        p.aller({ place: PORTE.clone(), angle: 0, debout: true });
      }
    }
  }

  maj(activite, nb, seance) {
    const board = new Set(seance);
    const multiples = new Set(
      [...nb.keys()].filter((id) => id !== "theo" && id !== "ceo"),
    );
    for (const [id, p] of this.persos)
      if (p.temporaire) multiples.add(id.split("#")[0]);
    for (const id of multiples) this.clones(id, nb.get(id) ?? 0);
    const sieges = this.d.sieges;
    let place = 0;
    for (const [id, p] of this.persos) {
      const base = id.split("#")[0];
      const texte = activite.get(base);
      const actif = p.temporaire ? p.voulu : texte != null;
      p.etat(actif, texte ?? "");
      if (p.temporaire) {
        p.ecran.material.emissiveIntensity = p.voulu ? 0.9 : 0.08;
        continue;
      }
      if (board.has(id) && actif && place < sieges.length)
        p.aller(sieges[place++]);
      else if (actif && texte.startsWith("pilote ")) {
        const cible = this.persos.get(texte.slice(7).split(" ")[0]);
        if (cible)
          p.aller({
            place: cible.siege.place
              .clone()
              .add(new THREE.Vector3(0.9, 0, 0.6)),
            angle: cible.siege.angle + 0.8,
            debout: true,
          });
      } else if (actif) p.aller(p.siege);
      const ecran = this.ecrans.get(id) ?? p.ecran;
      if (ecran) ecran.material.emissiveIntensity = actif ? 0.9 : 0.08;
    }
    this.d.ecranBoard.material.emissiveIntensity = place ? 0.9 : 0.1;
  }

  image() {
    const dt = Math.min(this.horloge.getDelta(), 0.1);
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
