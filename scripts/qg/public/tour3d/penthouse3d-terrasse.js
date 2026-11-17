// Terrasse Stairway to Heaven et plantes du penthouse : piscine à débordement, transats, brasero, palmiers.
import * as THREE from "three";
import { MAT } from "../meubles.js";
import { P, bloc, boule, texture, tube } from "./penthouse3d-base.js";
import { lueur, mat } from "./mobilier-base.js";

const PIERRE = mat("#ece6da", { roughness: 0.6 });
const ONDES = texture("ondes", 256, 256, (x) => {
  x.fillStyle = "#16a6d9";
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "rgba(220,250,255,0.55)";
  for (let i = 0; i < 40; i++) {
    x.lineWidth = 1 + (i % 3);
    x.beginPath();
    x.ellipse((i * 61) % 256, (i * 113) % 256, 18 + (i % 5) * 6, 6, 0, 0, 7);
    x.stroke();
  }
});
ONDES.wrapS = ONDES.wrapT = THREE.RepeatWrapping;
const EAU = new THREE.MeshStandardMaterial({
  map: ONDES,
  emissiveMap: ONDES,
  emissive: "#7fe3ff",
  emissiveIntensity: 0.7,
  transparent: true,
  opacity: 0.88,
  roughness: 0.05,
});
const CORTEN = mat("#7a3b1c", { roughness: 0.85, metalness: 0.3 });
const TRONC = mat("#8a6b4a", { roughness: 1 });

function palme(g, h, r, n) {
  tube(g, r * 0.55, 0.7, MAT.potNoir, 0, 0.35, 0, 0.8, 20);
  for (let k = 0; k < 5; k++)
    tube(
      g,
      0.09 - k * 0.01,
      h / 5,
      TRONC,
      k * 0.04,
      0.7 + (k + 0.5) * (h / 5),
      0,
      1.15,
      8,
    );
  for (let i = 0; i < n; i++) {
    const f = new THREE.Group();
    f.position.set(0.2, h + 0.7, 0);
    f.rotation.set(0, (i / n) * Math.PI * 2, -0.5 - (i % 2) * 0.35);
    g.add(f);
    bloc(f, 1.6 * r, 0.02, 0.32 * r, P.feuille, 0.8 * r, 0, 0);
  }
}

export const TERRASSE = {
  "p-piscine": (g, { l, q }, c) => {
    const h = 0.55;
    for (const s of [-1, 1]) {
      bloc(g, l, h, 0.18, PIERRE, 0, h / 2, (s * (q - 0.18)) / 2, true);
      bloc(g, 0.18, h, q, PIERRE, (s * (l - 0.18)) / 2, h / 2, 0, true);
    }
    const eau = bloc(
      g,
      l - 0.36,
      h - 0.08,
      q - 0.36,
      EAU,
      0,
      (h - 0.08) / 2,
      0,
    );
    eau.material.map.repeat.set(l / 3, q / 3);
    bloc(
      g,
      l - 0.2,
      0.5,
      0.02,
      lueur("#7fe3ff", 0.9),
      0,
      h - 0.3,
      -q / 2 - 0.02,
    );
    const lum = new THREE.PointLight("#5fd4ff", 5, 9, 1.6);
    lum.position.y = 0.9;
    g.add(lum);
    c.anime((dt) => (ONDES.offset.x += dt * 0.03));
  },
  "p-transat": (g, { l, q }) => {
    for (const s of [-1, 1])
      bloc(g, l, 0.04, 0.04, P.laque, 0, 0.25, (s * q) / 2.2);
    bloc(g, l * 0.65, 0.1, q * 0.9, P.laque, -l * 0.15, 0.32, 0, true);
    const dos = bloc(g, l * 0.35, 0.1, q * 0.9, P.laque, l * 0.3, 0.5, 0);
    dos.rotation.z = 0.6;
    bloc(g, l * 0.3, 0.02, q * 0.6, mat("#f0e6d2"), -l * 0.1, 0.38, 0);
  },
  "p-brasero": (g, { r }, c) => {
    tube(g, r * 0.5, 0.35, P.noir, 0, 0.18, 0, 1, 16);
    tube(g, r, 0.3, CORTEN, 0, 0.5, 0, 0.55, 24);
    const flammes = [0, 1, 2, 3].map((i) =>
      boule(
        g,
        0.18,
        0.5,
        0.18,
        lueur(i % 2 ? "#ffb02e" : "#ff5a1a", 2.6),
        Math.cos(i * 1.6) * r * 0.35,
        0.85,
        Math.sin(i * 1.6) * r * 0.35,
      ),
    );
    c.anime((dt, t) =>
      flammes.forEach(
        (f, i) => (f.scale.y = 0.4 + 0.15 * Math.sin(t * 7 + i * 2)),
      ),
    );
  },
  "p-palmier": (g, { r }) => palme(g, 3.2, r, 9),
  "p-plante": (g, { r }) => {
    tube(g, r * 0.6, 0.55, P.noir, 0, 0.28, 0, 0.75, 20);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      const y = 1.1 + (i % 4) * 0.45;
      tube(
        g,
        0.015,
        y - 0.5,
        TRONC,
        Math.cos(a) * 0.08,
        (y + 0.5) / 2,
        Math.sin(a) * 0.08,
        1,
        5,
      );
      const f = boule(
        g,
        0.42,
        0.06,
        0.95,
        P.feuille,
        Math.cos(a) * 0.35,
        y,
        Math.sin(a) * 0.35,
      );
      f.rotation.set(0.5, -a, 0);
    }
  },
};
