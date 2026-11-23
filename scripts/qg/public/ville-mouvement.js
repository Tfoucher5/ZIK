import * as THREE from "three";
import { toile } from "./meubles.js";
import { avancer, position, voitures } from "./ville-plan.js";

// La rue est au niveau du hall (RDC), juste sous sa dalle.
export const RUE = -0.05;
export const RAYON = 250;
export const vif = (c, k) => new THREE.Color(c).multiplyScalar(k);
const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();

export const poser = (im, i, [x, y, z], [sx, sy, sz] = [1, 1, 1], angle = 0) =>
  im.setMatrixAt(
    i,
    M.compose(
      P.set(x, y, z),
      Q.setFromEuler(E.set(0, angle, 0)),
      S.set(sx, sy, sz),
    ),
  );

export function instances(groupe, geo, mat, n) {
  const im = new THREE.InstancedMesh(geo, mat, n);
  groupe.add(im);
  return im;
}

export const halo = (rgb) =>
  toile(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${rgb},0.6)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });

export function trafic(groupe, voies) {
  const liste = voitures(voies, 6);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const creer = (mat, n) => {
    const im = instances(groupe, cube, mat, n);
    im.frustumCulled = false;
    return im;
  };
  const caisses = creer(
    new THREE.MeshLambertMaterial({ color: "#23232e" }),
    liste.length,
  );
  const phares = creer(
    new THREE.MeshBasicMaterial({ color: vif("#fff6e0", 6) }),
    liste.length * 2,
  );
  const arriere = creer(
    new THREE.MeshBasicMaterial({ color: vif("#ff1a1a", 4) }),
    liste.length * 2,
  );
  const l = [0.25, 0.2, 0.25];
  return (dt) => {
    liste.forEach((v, i) => {
      avancer(v, dt, voies[v.route].demi);
      const { x, z, dx, dz } = position(v, voies[v.route]);
      const y = RUE + 0.45;
      poser(caisses, i, [x, y, z], dx ? [2.4, 0.6, 1.1] : [1.1, 0.6, 2.4]);
      for (const k of [0, 1]) {
        const cote = k ? 0.4 : -0.4;
        poser(
          phares,
          i * 2 + k,
          [x + dx * 1.2 + dz * cote, y, z + dz * 1.2 + dx * cote],
          l,
        );
        poser(
          arriere,
          i * 2 + k,
          [x - dx * 1.2 + dz * cote, y, z - dz * 1.2 + dx * cote],
          l,
        );
      }
    });
    for (const im of [caisses, phares, arriere])
      im.instanceMatrix.needsUpdate = true;
  };
}

// Le ciel suit la caméra pour rester à l'infini sans sortir du champ de vision (far = 500).
function suivre(o, decalage = new THREE.Vector3()) {
  o.frustumCulled = false;
  o.onBeforeRender = (_r, _s, cam) => {
    o.position.copy(cam.position).add(decalage);
    o.updateMatrixWorld();
  };
}

export function ciel(groupe, r) {
  const pos = [];
  for (let i = 0; i < 1400; i++) {
    const a = r() * Math.PI * 2;
    const y = 0.08 + r() * 0.92;
    const k = Math.sqrt(1 - y * y) * 420;
    pos.push(Math.cos(a) * k, y * 420, Math.sin(a) * k);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const etoiles = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: vif("#dfe6ff", 1.3),
      size: 1.6,
      sizeAttenuation: false,
      fog: false,
    }),
  );
  const ou = new THREE.Vector3(-0.45, 0.32, -0.83).setLength(400);
  const lune = new THREE.Mesh(
    new THREE.SphereGeometry(10, 24, 16),
    new THREE.MeshBasicMaterial({ color: vif("#fff4dc", 2.5), fog: false }),
  );
  const aura = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: halo("160,176,255"),
      fog: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  aura.scale.setScalar(90);
  suivre(etoiles);
  suivre(lune, ou);
  suivre(aura, ou);
  groupe.add(etoiles, lune, aura);
}
