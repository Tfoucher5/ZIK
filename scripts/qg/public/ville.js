import * as THREE from "three";
import { ZIK } from "./deco.js";
import { toile } from "./meubles.js";
import {
  alea,
  emprise,
  enseigne,
  lampadaires,
  placerTours,
  routes,
} from "./ville-plan.js";
import {
  RAYON,
  RUE,
  ciel,
  halo,
  instances,
  poser,
  trafic,
  vif,
} from "./ville-mouvement.js";

const NEONS = [ZIK.neon, "#22d3ee", ZIK.or];

function fenetres(l, h, cols, rangs, r, eteints, hall = false) {
  const t = toile(l, h, (c) => {
    c.fillStyle = "#0b0b14";
    c.fillRect(0, 0, l, h);
    const cw = l / cols;
    const rh = h / rangs;
    for (let j = 0; j < rangs; j++) {
      const noir = r() < eteints;
      for (let i = 0; i < cols; i++) {
        const allume = hall && j === rangs - 1 ? true : !noir && r() < 0.55;
        const teinte = r();
        c.fillStyle = !allume
          ? "#171726"
          : teinte < 0.72
            ? "#ffd89a"
            : teinte < 0.94
              ? "#bfe0ff"
              : "#ff9be6";
        c.fillRect(
          i * cw + cw * 0.18,
          j * rh + rh * 0.22,
          cw * 0.64,
          rh * 0.56,
        );
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Fût de la tour sous le plateau, jusqu'à la rue, avec des arêtes néon.
function fut(groupe, contour, r) {
  const g = new THREE.ExtrudeGeometry(
    new THREE.Shape(contour.map(([x, z]) => new THREE.Vector2(x, z))),
    { depth: -RUE - 0.3, bevelEnabled: false },
  );
  g.rotateX(Math.PI / 2);
  g.translate(0, -0.3, 0);
  const tex = fenetres(512, 512, 20, 12, r, 0.15, true);
  tex.repeat.set(1 / 14, 1 / 16);
  tex.offset.y = 1 - 1 / 16;
  groupe.add(
    new THREE.Mesh(g, [
      new THREE.MeshLambertMaterial({ color: "#121219" }),
      new THREE.MeshLambertMaterial({
        color: "#2a2a36",
        map: tex,
        emissive: "#ffffff",
        emissiveMap: tex,
        emissiveIntensity: 0.5,
      }),
    ]),
  );
  const aretes = instances(
    groupe,
    new THREE.BoxGeometry(0.18, -RUE, 0.18),
    new THREE.MeshBasicMaterial({ color: vif(ZIK.neon, 3) }),
    contour.length,
  );
  contour.forEach(([x, z], i) => poser(aretes, i, [x, RUE / 2, z]));
}

function sol(groupe, voies) {
  const plan = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const s = new THREE.Mesh(
    new THREE.CircleGeometry(RAYON + 30, 64).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: "#0d0d15" }),
  );
  s.position.y = RUE;
  groupe.add(s);
  const asphalte = instances(
    groupe,
    plan,
    new THREE.MeshLambertMaterial({ color: "#1d1d29" }),
    voies.length,
  );
  const lignes = instances(
    groupe,
    plan,
    new THREE.MeshBasicMaterial({ color: "#6b5a2a" }),
    voies.length,
  );
  voies.forEach((v, i) => {
    const long = v.demi * 2;
    const [px, pz] = v.axe === "x" ? [v.c, v.o] : [v.o, v.c];
    const ech = (w) => (v.axe === "x" ? [long, 1, w] : [w, 1, long]);
    poser(asphalte, i, [px, RUE + 0.08, pz], ech(9));
    poser(lignes, i, [px, RUE + 0.16, pz], ech(0.2));
  });
  const pts = lampadaires(voies);
  const mats = instances(
    groupe,
    new THREE.CylinderGeometry(0.08, 0.1, 5).translate(0, 2.5, 0),
    new THREE.MeshLambertMaterial({ color: "#2a2a33" }),
    pts.length,
  );
  const tetes = instances(
    groupe,
    new THREE.BoxGeometry(0.7, 0.15, 0.7),
    new THREE.MeshBasicMaterial({ color: vif("#ffcf8a", 5) }),
    pts.length,
  );
  const flaques = instances(
    groupe,
    new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: halo("255,190,120"),
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    }),
    pts.length,
  );
  pts.forEach(([x, z], i) => {
    poser(mats, i, [x, RUE, z]);
    poser(tetes, i, [x, RUE + 5, z]);
    poser(flaques, i, [x, RUE + 0.2, z]);
  });
}

// Façades : la texture de fenêtres est collée en unités du monde, quelle que soit la taille de la tour.
function tours(groupe, liste, centre, r) {
  const tex = fenetres(256, 256, 8, 8, r, 0.12);
  const mat = new THREE.MeshLambertMaterial({
    color: "#2c2c3c",
    map: tex,
    emissive: "#ffffff",
    emissiveMap: tex,
    emissiveIntensity: 0.75,
  });
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace(
      "#include <uv_vertex>",
      `#include <uv_vertex>
      vec3 ech = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      vec2 fac = abs(normal.y) > 0.5 ? vec2(0.0) : uv * vec2(abs(normal.x) > 0.5 ? ech.z : ech.x, ech.y) / vec2(16.0, 24.0) + fract(instanceMatrix[3].xz * 0.137);
      vMapUv = fac;
      vEmissiveMapUv = fac;`,
    );
  };
  const blocs = instances(
    groupe,
    new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    mat,
    liste.length,
  );
  const teinte = new THREE.Color();
  liste.forEach((t, i) => {
    poser(blocs, i, [t.x, RUE, t.z], [t.l, t.h, t.p]);
    blocs.setColorAt(
      i,
      teinte.setHSL(0.68 + r() * 0.1, 0.25, 0.35 + r() * 0.3),
    );
  });

  const avecEnseigne = liste.filter((t) => t.h > 25 && r() < 0.3);
  const neons = instances(
    groupe,
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: vif("#ffffff", 3.5),
      side: THREE.DoubleSide,
    }),
    avecEnseigne.length,
  );
  avecEnseigne.forEach((t, i) => {
    const e = enseigne(t, centre);
    poser(neons, i, [e.x, RUE + e.y, e.z], [1.4, e.h, 1], e.angle);
    neons.setColorAt(i, teinte.set(NEONS[i % NEONS.length]));
  });

  const hautes = liste.filter((t) => t.h > 60);
  const mats = instances(
    groupe,
    new THREE.CylinderGeometry(0.12, 0.2, 8).translate(0, 4, 0),
    new THREE.MeshLambertMaterial({ color: "#3a3a44" }),
    hautes.length,
  );
  const feu = new THREE.MeshBasicMaterial({ color: vif("#ff2020", 4) });
  const feux = instances(
    groupe,
    new THREE.SphereGeometry(0.35, 8, 6),
    feu,
    hautes.length,
  );
  hautes.forEach((t, i) => {
    poser(mats, i, [t.x, RUE + t.h, t.z]);
    poser(feux, i, [t.x, RUE + t.h + 8.2, t.z]);
  });
  return feu;
}

export function ville(scene, { contour, hauteurTour = 12.6 }) {
  const groupe = new THREE.Group();
  scene.add(groupe);
  const r = alea(42);
  const plateau = emprise(contour);
  const voies = routes(plateau, RAYON);
  const liste = placerTours(240, {
    centre: plateau.centre,
    voies,
    rayon: RAYON,
    plafond: hauteurTour - RUE,
  });
  fut(groupe, contour, r);
  sol(groupe, voies);
  const feu = tours(groupe, liste, plateau.centre, r);
  const rouler = trafic(groupe, voies);
  ciel(groupe, r);
  return {
    animer(dt, t) {
      rouler(dt);
      feu.color.setRGB(Math.sin(t * 2.5) > 0.4 ? 4 : 0.15, 0, 0);
    },
  };
}
