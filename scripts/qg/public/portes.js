import * as THREE from "three";

// Portes battantes : fermées au repos, elles s'ouvrent quand quelqu'un approche.
const PORTES = [];
const OUVERTURE = 1.45;

export const oublierPortes = () => (PORTES.length = 0);

export function porte(scene, x, z, angle, l, mat, sens = 1) {
  const pivot = new THREE.Group();
  pivot.position.set(x, 0, z);
  pivot.rotation.y = angle;
  const vantail = new THREE.Mesh(
    new THREE.BoxGeometry(l - 0.05, 2.1, 0.04),
    mat,
  );
  vantail.position.set(l / 2, 1.05, 0);
  vantail.castShadow = true;
  const poignee = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.03, 0.1),
    new THREE.MeshStandardMaterial({ color: "#c3c8cf", metalness: 0.8 }),
  );
  poignee.position.set(l - 0.15, 1.02, 0);
  pivot.add(vantail, poignee);
  scene.add(pivot);
  PORTES.push({
    pivot,
    ferme: angle,
    ouvert: angle - sens * OUVERTURE,
    centre: new THREE.Vector3(
      x + (Math.cos(angle) * l) / 2,
      0,
      z - (Math.sin(angle) * l) / 2,
    ),
  });
  return pivot;
}

// positions : en coordonnées du monde ; une porte ne s'ouvre que pour quelqu'un de son étage.
export function animerPortes(dt, positions) {
  for (const p of PORTES) {
    const y = p.pivot.parent?.position.y ?? 0;
    const proche = positions.some(
      (q) =>
        Math.abs(q.y - y) < 1.5 &&
        Math.hypot(q.x - p.centre.x, q.z - p.centre.z) < 1.3,
    );
    const but = proche ? p.ouvert : p.ferme;
    p.pivot.rotation.y += (but - p.pivot.rotation.y) * Math.min(1, dt * 6);
  }
}
