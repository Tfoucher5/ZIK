import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// e.code suit la place de la touche : KeyW est le Z d'un clavier AZERTY, KeyA son Q.
const TOUCHES = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};
const saisie = (el) =>
  el?.closest?.("input, textarea, select, [contenteditable]");
const HAUT = new THREE.Vector3(0, 1, 0);

// Caméra libre : clic gauche tourne, clic droit ou clic molette déplace, molette zoome vers le curseur,
// ZQSD ou flèches avancent, double-clic sur le sol s'y rend. Toujours au-dessus du sol, jamais loin du plateau.
export class Camera {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.y = 0;
    this.c = new OrbitControls(camera, dom);
    Object.assign(this.c, {
      enableDamping: true,
      dampingFactor: 0.08,
      maxPolarAngle: Math.PI / 2.3,
      minDistance: 3,
      zoomToCursor: true,
      screenSpacePanning: false,
    });
    this.c.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.c.addEventListener("start", () => (this.vol = null));
    this.appuyees = new Set();
    addEventListener("keydown", (e) => {
      if (!TOUCHES[e.code] || saisie(e.target) || e.ctrlKey || e.metaKey)
        return;
      e.preventDefault();
      this.appuyees.add(e.code);
      this.vol = null;
    });
    addEventListener("keyup", (e) => this.appuyees.delete(e.code));
    addEventListener("blur", () => this.appuyees.clear());
    dom.addEventListener("dblclick", (e) => {
      const p = this.sol(e);
      if (p) this.vol = { cible: p, distance: Math.min(this.distance(), 18) };
    });
  }

  distance() {
    return this.camera.position.distanceTo(this.c.target);
  }

  // Point du sol de l'étage affiché sous le curseur, ou null hors de l'étage.
  sol(e) {
    const r = this.dom.getBoundingClientRect();
    const rayon = new THREE.Raycaster();
    rayon.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      ),
      this.camera,
    );
    const sol = new THREE.Plane(HAUT, -this.y);
    const p = rayon.ray.intersectPlane(sol, new THREE.Vector3());
    return p && this.bornes?.containsPoint(p) ? p : null;
  }

  // Vue d'ensemble d'un étage [xmin, xmax, zmin, zmax] à la hauteur this.y, cadrée sur la zone 3D.
  // Renvoie la distance de la vue d'ensemble.
  cadrer(cadre, ensemble = true) {
    const [x0, x1, z0, z1] = cadre;
    this.cadre = cadre;
    const y = this.y;
    this.bornes = new THREE.Box3(
      new THREE.Vector3(x0, y - 1, z0),
      new THREE.Vector3(x1, y + 1, z1),
    );
    const demiV = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const demiH = Math.atan(Math.tan(demiV) * this.camera.aspect);
    const d =
      1.05 *
      Math.max(
        (x1 - x0) / 2 / Math.tan(demiH),
        (z1 - z0) / 2 / Math.tan(demiV),
      );
    this.c.maxDistance = d * 1.6;
    if (!ensemble) return d;
    this.vol = null;
    this.c.target.set((x0 + x1) / 2, y, (z0 + z1) / 2 + 0.5);
    this.camera.position
      .copy(this.c.target)
      .add(new THREE.Vector3(0.1, 0.71, 0.7).normalize().multiplyScalar(d));
    return d;
  }

  // Vol vers un étage (ascenseur) : même angle de vue, nouvelle hauteur et nouvelles bornes.
  voler(cadre, y, recul = 1) {
    this.y = y;
    const d = this.cadrer(cadre, false) * recul;
    this.c.maxDistance = Math.max(this.c.maxDistance, d * 1.3);
    const [x0, x1, z0, z1] = cadre;
    this.vol = {
      cible: new THREE.Vector3((x0 + x1) / 2, y, (z0 + z1) / 2 + 0.5),
      distance: d,
    };
  }

  // Décale la cible et la caméra ensemble : la vue glisse sans tourner.
  glisser(v) {
    this.c.target.add(v);
    this.camera.position.add(v);
  }

  maj(dt) {
    const devant = this.c.target.clone().sub(this.camera.position).setY(0);
    devant.normalize();
    const droite = new THREE.Vector3(-devant.z, 0, devant.x);
    const v = new THREE.Vector3();
    for (const code of this.appuyees) {
      const [dx, dz] = TOUCHES[code];
      v.addScaledVector(droite, dx).addScaledVector(devant, dz);
    }
    if (v.lengthSq())
      this.glisser(
        v.normalize().multiplyScalar(dt * (2 + this.distance() * 0.3)),
      );
    if (this.vol) {
      const k = 1 - Math.exp(-dt * 4);
      this.glisser(this.vol.cible.clone().sub(this.c.target).multiplyScalar(k));
      const d = this.distance();
      const recul = this.camera.position.clone().sub(this.c.target);
      recul.setLength(d + (this.vol.distance - d) * k);
      this.camera.position.copy(this.c.target).add(recul);
      if (
        this.c.target.distanceTo(this.vol.cible) < 0.05 &&
        Math.abs(this.distance() - this.vol.distance) < 0.5
      )
        this.vol = null;
    }
    this.c.update();
    if (this.bornes && !this.vol) {
      const dedans = this.c.target
        .clone()
        .clamp(this.bornes.min, this.bornes.max);
      this.glisser(dedans.sub(this.c.target).setY(this.y - this.c.target.y));
    }
  }
}
