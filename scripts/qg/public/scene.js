import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";

const COULEURS = {
  theo: "#ffffff",
  ceo: "#f5c542",
  argent: "#ffd166",
  operations: "#ff9f43",
  produit: "#b388ff",
  tech: "#4dabf7",
  marketing: "#ff6b9d",
  board: "#ff5252",
  renforts: "#8892a6",
};

export class Scene3D {
  constructor(conteneur, surClic) {
    this.noeuds = new Map();
    this.liens = [];
    this.particules = [];
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05070d, 0.018);
    this.camera = new THREE.PerspectiveCamera(
      50,
      innerWidth / innerHeight,
      0.1,
      400,
    );
    this.camera.position.set(0, 14, 34);
    this.rendu = new THREE.WebGLRenderer({ antialias: true });
    this.rendu.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.rendu.setSize(innerWidth, innerHeight);
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
    this.controles.target.set(0, 2, 0);
    this.controles.enableDamping = true;
    this.controles.autoRotate = true;
    this.controles.autoRotateSpeed = 0.35;
    this.scene.add(new THREE.AmbientLight(0x8090b0, 0.6));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.2);
    soleil.position.set(10, 20, 10);
    this.scene.add(soleil);
    const grille = new THREE.GridHelper(80, 40, 0x1c2a4a, 0x111a2e);
    grille.position.y = -6;
    this.scene.add(grille);
    this.etoiles();
    const rayon = new THREE.Raycaster();
    this.rendu.domElement.addEventListener("click", (e) => {
      const p = new THREE.Vector2(
        (e.clientX / innerWidth) * 2 - 1,
        -(e.clientY / innerHeight) * 2 + 1,
      );
      rayon.setFromCamera(p, this.camera);
      const touche = rayon.intersectObjects(
        [...this.noeuds.values()].map((n) => n.mesh),
      )[0];
      surClic(touche?.object.userData.id ?? null);
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

  etoiles() {
    const pos = new Float32Array(1500 * 3).map(
      () => (Math.random() - 0.5) * 300,
    );
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.scene.add(
      new THREE.Points(
        g,
        new THREE.PointsMaterial({ color: 0x6f7fa8, size: 0.25 }),
      ),
    );
  }

  noeud(id, nom, position, couleur, taille, parent) {
    const c = new THREE.Color(couleur);
    const mat = new THREE.MeshStandardMaterial({
      color: c,
      emissive: c,
      emissiveIntensity: 0.12,
      roughness: 0.35,
      metalness: 0.5,
    });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(taille, 2), mat);
    mesh.position.copy(position);
    mesh.userData.id = id;
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(taille * 1.6, 0.04, 8, 64),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0 }),
    );
    halo.position.copy(position);
    halo.rotation.x = Math.PI / 2;
    const div = document.createElement("div");
    div.className = "etiquette repos";
    div.innerHTML = `<div class="nom"></div><div class="act"></div>`;
    div.querySelector(".nom").textContent = nom;
    const etiquette = new CSS2DObject(div);
    etiquette.position.set(0, taille + 0.7, 0);
    mesh.add(etiquette);
    this.scene.add(mesh, halo);
    const n = {
      id,
      mesh,
      halo,
      div,
      taille,
      actif: false,
      phase: Math.random() * 6,
    };
    this.noeuds.set(id, n);
    if (parent) {
      const g = new THREE.BufferGeometry().setFromPoints([
        parent.mesh.position,
        position,
      ]);
      const ligne = new THREE.Line(
        g,
        new THREE.LineBasicMaterial({
          color: c,
          transparent: true,
          opacity: 0.18,
        }),
      );
      this.scene.add(ligne);
      this.liens.push({ de: parent, vers: n, ligne, couleur: c });
    }
    return n;
  }

  construire(org) {
    const theo = this.noeud(
      "theo",
      "Théo · fondateur",
      new THREE.Vector3(0, 12, 0),
      COULEURS.theo,
      1.1,
    );
    const ceo = this.noeud(
      "ceo",
      "CEO",
      new THREE.Vector3(0, 7.5, 0),
      COULEURS.ceo,
      1,
      theo,
    );
    const chefs = org.chefs.filter((c) => c.id !== "ceo");
    chefs.forEach((chef, i) => {
      const a = (i / chefs.length) * Math.PI * 2;
      const pos = new THREE.Vector3(Math.cos(a) * 12, 2, Math.sin(a) * 12);
      const couleur = COULEURS[chef.id] ?? COULEURS.renforts;
      const n = this.noeud(chef.id, chef.nom, pos, couleur, 0.8, ceo);
      chef.equipe.forEach((membre, j) => {
        const b = a + (j - (chef.equipe.length - 1) / 2) * 0.42;
        const p = new THREE.Vector3(
          Math.cos(b) * 17.5,
          -2.5 - (j % 2) * 1.2,
          Math.sin(b) * 17.5,
        );
        this.noeud(membre, membre, p, couleur, 0.42, n);
      });
    });
    org.board
      .filter((m) => !m.startsWith("chef-"))
      .forEach((m, i) => {
        const p = new THREE.Vector3(i ? 5 : -5, 9, 3);
        this.noeud(m, m, p, COULEURS.board, 0.55, ceo);
      });
    this.noeud(
      "renforts",
      "Renforts",
      new THREE.Vector3(0, -2, 0),
      COULEURS.renforts,
      0.6,
      ceo,
    );
  }

  maj(activite) {
    for (const n of this.noeuds.values()) {
      const a = activite.get(n.id);
      n.actif = Boolean(a);
      n.div.classList.toggle("repos", !n.actif);
      n.div.querySelector(".act").textContent = a ?? "";
    }
    for (const l of this.liens) {
      l.ligne.material.opacity = l.vers.actif ? 0.85 : 0.18;
      const voulu = l.vers.actif ? 3 : 0;
      const presents = this.particules.filter((p) => p.lien === l);
      for (let i = presents.length; i < voulu; i++)
        this.particule(l, i / voulu);
      if (!voulu) for (const p of presents) this.retirer(p);
    }
  }

  particule(lien, depart) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: lien.couleur }),
    );
    this.scene.add(m);
    this.particules.push({ lien, m, t: depart });
  }

  retirer(p) {
    this.scene.remove(p.m);
    this.particules.splice(this.particules.indexOf(p), 1);
  }

  image() {
    const dt = this.horloge.getDelta();
    const t = this.horloge.elapsedTime;
    for (const n of this.noeuds.values()) {
      const pouls = n.actif ? 1 + Math.sin(t * 4 + n.phase) * 0.12 : 1;
      n.mesh.scale.setScalar(pouls);
      n.mesh.material.emissiveIntensity +=
        ((n.actif ? 1.1 : 0.12) - n.mesh.material.emissiveIntensity) * 0.08;
      n.mesh.rotation.y += dt * (n.actif ? 1.2 : 0.15);
      n.halo.material.opacity +=
        ((n.actif ? 0.8 : 0) - n.halo.material.opacity) * 0.08;
      n.halo.rotation.z += dt * 0.8;
      n.halo.scale.setScalar(
        1 + (n.actif ? Math.sin(t * 2 + n.phase) * 0.15 : 0),
      );
    }
    for (const p of this.particules) {
      p.t = (p.t + dt * 0.45) % 1;
      p.m.position.lerpVectors(
        p.lien.de.mesh.position,
        p.lien.vers.mesh.position,
        p.t,
      );
    }
    this.controles.update();
    this.rendu.render(this.scene, this.camera);
    this.etiquettes.render(this.scene, this.camera);
  }
}
