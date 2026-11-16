import * as THREE from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { Camera } from "./camera.js";
import { Grille } from "./chemins.js";
import { NOMS } from "./disposition.js";
import { COULEURS, plan } from "./plan.js";
import { fiche } from "./noms.js";
import { Perso } from "./perso.js";
import { animerPortes, oublierPortes } from "./portes.js";
import { Recrutement } from "./recrutement.js";

// Ces métiers restent à leur poste ; les autres se réunissent en salle dès qu'ils sont deux du même service.
const AU_POSTE = ["dev", "test-writer", "reviewer", "recette", "incident"];

export class Scene3D {
  constructor(conteneur, surClic) {
    this.conteneur = conteneur;
    this.persos = new Map();
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
      const id = rayon.intersectObjects(
        [...this.persos.values()].flatMap((x) => x.cliquables),
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
    this.etiquettes.setSize(l, h);
    if (this.bornes) this.vue.cadrer(this.bornes, false);
  }

  // Jour ou nuit selon l'heure du PC.
  ambiance() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const jour = h > 7.5 && h < 18.5;
    this.scene.background = new THREE.Color(jour ? "#1b1724" : "#0b0b10");
    this.ciel.intensity = jour ? 1.1 : 0.55;
    this.soleil.intensity = jour ? 2.2 : 0.5;
    this.soleil.color.set(jour ? "#fff1dc" : "#9fb4ff");
  }

  // Ancienne entrée : l'organigramme du CLAUDE.md, gardé en repli tant que /agents n'existe pas.
  construire(org) {
    this.equipe.repli(org);
  }

  // Monte le plateau pour une disposition (place des pôles, bord ouest) ; tout ce qui existait est retiré.
  monter(disposition, limites) {
    this.vider();
    const premier = !this.d;
    this.grille = new Grille(...limites);
    this.d = plan(this.scene, this.grille, disposition);
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
    this.vue.cadrer(this.bornes, premier);
    this.perso("theo", undefined, "#ffffff", this.d.theo);
    this.perso("accueil", undefined, "#ff00ff", this.d.accueil).fixe = true;
    this.perso("ceo", undefined, COULEURS.ceo, this.d.ceo);
    for (const [id, s] of Object.entries(this.d.services))
      this.perso(id, undefined, COULEURS[id], s.chef);
  }

  vider() {
    if (!this.d) return;
    oublierPortes();
    this.scene.traverse((o) => o.element?.remove());
    for (const o of [...this.scene.children]) {
      if (o === this.ciel || o === this.soleil) continue;
      o.traverse((x) => x.geometry?.dispose());
      this.scene.remove(o);
    }
    this.persos.clear();
  }

  // role et nom remplacent ceux de noms.js quand /agents les donne.
  perso(id, role, couleur, siege, nom) {
    const base = fiche(id, role ?? id);
    const f = { ...base, ...(nom && { nom }), ...(role && { role }) };
    const p = new Perso(this.scene, this.grille, id, f, couleur, siege);
    this.persos.set(id, p);
    return p;
  }

  retirer(id) {
    const p = this.persos.get(id);
    if (!p) return;
    this.scene.remove(p.g);
    p.lab.element.remove();
    this.persos.delete(id);
  }

  // Copies d'un agent lancé plusieurs fois : elles sortent de l'ascenseur, prennent un poste libre et repartent.
  clones(id, n) {
    const svc = this.equipe.service(id);
    const libres = this.equipe.libres(svc);
    const voulus = id === "renforts" ? n : n - 1;
    const asc = this.d.ascenseur;
    for (let i = 0; i < libres.length; i++) {
      const cle = `${id}#${i + 2}`;
      let p = this.persos.get(cle);
      if (i < voulus && !p) {
        p = this.perso(
          cle,
          id === "renforts" ? "renfort" : fiche(id).role,
          COULEURS[svc],
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
    if (!this.d) return;
    const multiples = new Set(
      [...nb.keys()].filter((id) => id !== "theo" && id !== "ceo"),
    );
    for (const [id, p] of this.persos)
      if (p.temporaire && id.includes("#")) multiples.add(id.split("#")[0]);
    for (const id of multiples) this.clones(id, nb.get(id) ?? 0);
    const enSeance = new Set(seance);
    const reunions = new Map();
    for (const [id, s] of Object.entries(this.d.services)) {
      const membres = (this.equipe.modele.equipes[id] ?? []).filter(
        (m) => activite.has(m) && !AU_POSTE.includes(m) && !enSeance.has(m),
      );
      if (membres.length >= 2) {
        reunions.set(id, { salle: s.salle, membres });
        s.salle.tele.allumer(
          `Réunion ${NOMS[id]}`,
          membres.map((m) => `${fiche(m).nom} · ${activite.get(m)}`),
        );
      } else s.salle.tele.eteindre();
    }
    const salleDe = (m) =>
      [...reunions.values()].find((r) => r.membres.includes(m));
    let siege = 0;
    for (const [id, p] of this.persos) {
      const base = id.split("#")[0];
      const texte = activite.get(base);
      const nouveau = p.arrivee > 0;
      const actif = p.temporaire ? p.voulu : texte != null || nouveau;
      if (p.actif && !actif) p.pause = 1 + Math.random() * 4;
      p.etat(actif, texte ?? (nouveau ? "vient d'arriver" : ""));
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
      else if (texte?.startsWith("pilote ")) {
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
    if (siege)
      this.d.board.tele.allumer(
        "Board en séance",
        seance.map((m) => `${fiche(m).nom} · ${fiche(m).role ?? m}`),
      );
    else this.d.board.tele.eteindre();
  }

  image() {
    const dt = Math.min(this.horloge.getDelta(), 0.25);
    this.vue.maj(dt);
    if (this.d) {
      const t = this.horloge.elapsedTime;
      const prises = new Set([...this.persos.values()].map((p) => p.but));
      const libres = this.d.pauses.filter((p) => !prises.has(p));
      for (const [id, p] of this.persos) {
        if (p.arrivee > 0) p.arrivee -= dt;
        if (!p.actif && !p.temporaire && !p.fixe) p.flaner(dt, libres);
        p.animer(dt, t);
        if (p.depart && !p.chemin.length) this.retirer(id);
      }
      animerPortes(
        dt,
        [...this.persos.values()].map((p) => p.g.position),
      );
      for (const s of Object.values(this.d.services)) s.salle.tele.animer(dt);
      this.d.board.tele.animer(dt);
    }
    this.rendu.render(this.scene, this.camera);
    this.etiquettes.render(this.scene, this.camera);
  }
}
