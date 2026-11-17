// Noyau : gaines, cabines qui circulent pour de vrai, portes palières, escaliers E1 et E2.
import * as THREE from "three";
import { MAT } from "../meubles.js";
import { E2, NIVEAUX, NOYAU, niveau } from "../tour/plan.js";
import { versLocal } from "./repere.js";
import { DALLE, mursNoyau } from "./structure-plan.js";
import { instances, matrice, panneau } from "./structure-facade.js";

const VITESSE = 2;
const PORTES = 0.8;
const HCAB = 2.4;
const voile = new THREE.MeshStandardMaterial({
  color: "#b9b6b0",
  roughness: 0.9,
});
const marche = new THREE.MeshStandardMaterial({
  color: "#8e8b86",
  roughness: 0.8,
});
const inox = new THREE.MeshStandardMaterial({
  color: "#c8ccd2",
  metalness: 0.85,
  roughness: 0.25,
});
const lumiere = new THREE.MeshStandardMaterial({
  color: "#fff",
  emissive: "#fff3dd",
  emissiveIntensity: 1.2,
});
const PAROIS = { A1: inox, A2: inox, MC: MAT.noir, AP: MAT.or };

// Deux volées et un palier : v1 monte de 0 à h/2, v2 de h/2 à h en sens inverse. axe : sens de la marche.
function volees(liste, v1, v2, axe, h) {
  const m = Math.max(6, Math.round(h / 0.36));
  const pas = h / (2 * m);
  const long = axe === "x" ? v1[2] : v1[3];
  const giron = (long - 1.2) / m;
  const pose = (v, s, haut, prof) => {
    const [x, y, l, p] = v;
    const c =
      axe === "x" ? versLocal(x + s, y + p / 2) : versLocal(x + l / 2, y + s);
    const [lx, lz] = axe === "x" ? [prof, p] : [l, prof];
    liste.push(matrice(c.x, haut - 0.1, c.z, lx, 0.2, lz));
  };
  for (let k = 0; k < m; k++) {
    pose(v1, giron * (k + 0.5), (k + 1) * pas, giron);
    pose(v2, long - 1.2 - giron * (k + 0.5), h / 2 + (k + 1) * pas, giron);
  }
  pose(v1, long - 0.6, h / 2, 1.2);
  pose(v2, long - 0.6, h / 2, 1.2);
}

const suivant = (n) => NIVEAUX[NIVEAUX.indexOf(n) + 1];

function escaliers(groupes) {
  const [a, b, c, d] = E2.rect;
  const e2 = [
    [a + 0.2, b + 0.2, (c - a) / 2 - 0.25, d - b - 0.4],
    [(a + c) / 2 + 0.05, b + 0.2, (c - a) / 2 - 0.25, d - b - 0.4],
  ];
  for (const n of NIVEAUX) {
    const liste = [];
    const haut = suivant(n);
    for (const e of NOYAU.escaliers)
      if (haut && e.dessert.includes(n.id) && e.dessert.includes(haut.id))
        volees(liste, e.volees[0], e.volees[1], "x", n.h);
    if (haut && E2.dessert.includes(n.id) && E2.dessert.includes(haut.id))
      volees(liste, e2[0], e2[1], "y", n.h);
    instances(groupes[n.id], liste, marche);
    const ed = E2.edicules?.[n.id];
    if (ed) {
      const g = groupes[n.id];
      const H = 2.8;
      panneau(g, [ed[0], ed[1], ed[2], ed[1]], 0, H, voile);
      panneau(g, [ed[2], ed[1], ed[2], ed[3]], 0, H, voile);
      panneau(g, [ed[0], ed[3], ed[2], ed[3]], 0, H, voile);
      panneau(g, [ed[0], ed[1], ed[0], ed[3]], 0, H, voile);
      const c2 = versLocal((ed[0] + ed[2]) / 2, (ed[1] + ed[3]) / 2);
      instances(
        g,
        [
          matrice(
            c2.x,
            H + 0.1,
            c2.z,
            ed[2] - ed[0] + 0.3,
            0.2,
            ed[3] - ed[1] + 0.3,
          ),
        ],
        MAT.noir,
      );
    }
  }
}

// Cabine ouverte du côté de sa porte, posée sur y = 0 de son groupe.
function cabine(a) {
  const [x, y, l, p] = a.cabine;
  const g = new THREE.Group();
  const c = versLocal(x + l / 2, y + p / 2);
  const cotes = [
    [x, y, x + l, y],
    [x + l, y, x + l, y + p],
    [x, y + p, x + l, y + p],
    [x, y, x, y + p],
  ];
  const surPorte = ([x1, y1, x2, y2]) =>
    a.porte.axe === "v"
      ? x1 === x2 && Math.abs(x1 - a.porte.x) < 0.05
      : y1 === y2 && Math.abs(y1 - a.porte.y) < 0.05;
  const pr = PAROIS[a.id] ?? inox;
  const corps = new THREE.Group();
  corps.position.set(-c.x, 0, -c.z);
  for (const s of cotes) if (!surPorte(s)) panneau(corps, s, 0, HCAB, pr, 0.06);
  g.add(corps);
  const sol = new THREE.Mesh(
    new THREE.BoxGeometry(l - 0.1, 0.08, p - 0.1),
    MAT.noir,
  );
  const toit = new THREE.Mesh(
    new THREE.BoxGeometry(l - 0.1, 0.06, p - 0.1),
    lumiere,
  );
  toit.position.y = HCAB;
  g.add(sol, toit);
  return { g, c };
}

// Deux vantaux sur la ligne de la porte palière, qui coulissent chacun d'un demi-passage.
function portePaliere(parent, porte) {
  const { x, y, l, axe } = porte;
  const cote = porte.cote ?? 0;
  const off = cote * 0.08;
  const vantaux = [0.25, 0.75].map((f) => {
    const c =
      axe === "v"
        ? versLocal(x + off, y + l * f)
        : versLocal(x + l * f, y + off);
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(
        axe === "v" ? 0.05 : l / 2,
        2.2,
        axe === "v" ? l / 2 : 0.05,
      ),
      inox,
    );
    m.position.set(c.x, 1.1, c.z);
    parent.add(m);
    return { m, x: c.x, z: c.z };
  });
  return (o) =>
    vantaux.forEach((v, k) => {
      const d = (k ? 1 : -1) * o * (l / 2) * 0.95;
      v.m.position.set(
        v.x + (axe === "h" ? d : 0),
        1.1,
        v.z + (axe === "v" ? d : 0),
      );
    });
}

export function noyau(scene, groupes) {
  for (const id of NOYAU.niveaux) {
    const n = niveau(id);
    for (const m of mursNoyau(id))
      panneau(groupes[id], m, 0, n.h - DALLE, voile, 0.2);
  }
  escaliers(groupes);

  const cabines = new THREE.Group();
  scene.add(cabines);
  const etats = [];
  const ascenseurs = {};
  for (const a of NOYAU.ascenseurs) {
    const { g, c } = cabine(a);
    cabines.add(g);
    const portes = Object.fromEntries(
      a.dessert.map((id) => [
        id,
        { poser: portePaliere(groupes[id], a.porte), o: 0, cible: 0 },
      ]),
    );
    const depart = a.dessert.includes("n0") ? "n0" : a.dessert[0];
    const e = {
      g,
      portes,
      ici: depart,
      y: niveau(depart).z,
      cibleY: null,
      fin: null,
      file: Promise.resolve(),
    };
    g.position.set(c.x, e.y, c.z);
    etats.push(e);
    const attendre = (prep) =>
      new Promise((ok) => {
        prep();
        e.fin = ok;
      });
    const trajet = async (id) => {
      if (id !== e.ici) {
        await attendre(() => (e.portes[e.ici].cible = 0));
        await attendre(() => (e.cibleY = niveau(id).z));
        e.ici = id;
      }
      await attendre(() => (e.portes[id].cible = 1));
    };
    ascenseurs[a.id] = {
      cabine: g,
      dessert: [...a.dessert],
      niveau: () => e.ici,
      aller(id) {
        if (!a.dessert.includes(id))
          return Promise.reject(new Error(`${a.id} ne dessert pas ${id}`));
        e.file = e.file.catch(() => {}).then(() => trajet(id));
        return e.file;
      },
    };
  }

  let plafond = Infinity;
  return {
    ascenseurs,
    limite(p) {
      plafond = p;
    },
    animer(dt) {
      for (const e of etats) {
        let fini = true;
        if (e.cibleY !== null) {
          const d = e.cibleY - e.y;
          const pas = VITESSE * dt;
          e.y = Math.abs(d) <= pas ? e.cibleY : e.y + Math.sign(d) * pas;
          if (e.y === e.cibleY) e.cibleY = null;
          else fini = false;
        }
        for (const p of Object.values(e.portes)) {
          if (p.o === p.cible) continue;
          const pas = dt / PORTES;
          p.o =
            Math.abs(p.cible - p.o) <= pas
              ? p.cible
              : p.o + Math.sign(p.cible - p.o) * pas;
          p.poser(p.o);
          if (p.o !== p.cible) fini = false;
        }
        e.g.position.y = e.y;
        e.g.visible = e.y < plafond;
        if (fini && e.fin) {
          const ok = e.fin;
          e.fin = null;
          ok();
        }
      }
    },
  };
}
