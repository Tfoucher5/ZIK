import { beforeAll, describe, expect, it, vi } from "vitest";
import { Grille } from "../public/chemins.js";
import { ETAGES } from "../public/etages.js";

// three.js n'est pas installé (chargé par CDN) : un objet factice qui accepte tout suffit
// pour monter l'étage ; seuls les vecteurs gardent leurs coordonnées.
const factice = () =>
  new Proxy(function () {}, {
    get: (t, k) =>
      k === "then" || k === Symbol.toPrimitive
        ? undefined
        : k in t
          ? t[k]
          : (t[k] = factice()),
    apply: () => factice(),
    construct: () => factice(),
  });

vi.mock("three", () => {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      Object.assign(this, { x, y, z });
    }
    clone() {
      return new Vector3(this.x, this.y, this.z);
    }
    setY(y) {
      this.y = y;
      return this;
    }
    addScaledVector(v, s) {
      this.x += v.x * s;
      this.z += v.z * s;
      return this;
    }
  }
  const noms = [
    "Box3 BoxGeometry CanvasTexture CapsuleGeometry Clock Color CylinderGeometry",
    "DirectionalLight Group HemisphereLight IcosahedronGeometry Mesh",
    "MeshPhysicalMaterial MeshStandardMaterial Plane PlaneGeometry PointLight",
    "Raycaster Scene Shape ShapeGeometry SphereGeometry TorusGeometry Vector2",
    "WebGLRenderer MathUtils MOUSE DoubleSide SRGBColorSpace RepeatWrapping PCFSoftShadowMap",
  ]
    .join(" ")
    .split(" ");
  return {
    ...Object.fromEntries(noms.map((n) => [n, factice()])),
    Vector3,
  };
});
vi.mock("three/addons/renderers/CSS2DRenderer.js", () => ({
  CSS2DObject: factice(),
}));

let etage;
let plateau;
beforeAll(async () => {
  globalThis.document = factice();
  const { direction } = await import("../public/direction.js");
  const grille = new Grille(...ETAGES[1].bornes);
  etage = { grille, ...direction(factice(), grille) };
  const { plan, limites } = await import("../public/plan.js");
  const { disposer } = await import("../public/disposition.js");
  const d = disposer({ produit: 7, tech: 5, operations: 3, marketing: 4 });
  const g = new Grille(...limites(d.ouest));
  plateau = { grille: g, ...plan(factice(), g, d) };
});

describe("plateau", () => {
  it("relie l'ascenseur aux postes et aux pauses, sans bureau de chef", () => {
    const depart = plateau.ascenseur.place;
    const sieges = [
      ...Object.values(plateau.services).flatMap((s) => s.postes),
      ...plateau.renforts,
      ...plateau.pauses,
    ];
    for (const s of sieges) {
      const t = plateau.grille.trajet(depart, s.place);
      expect(t.length, `${s.place.x}, ${s.place.z}`).toBeGreaterThan(0);
    }
    expect(Object.values(plateau.services)[0].chef).toBeUndefined();
  });
});

describe("direction", () => {
  it("donne un bureau à chaque chef, à Claire et à Victor", () => {
    expect(Object.keys(etage.chefs).sort()).toEqual(
      ["argent", "marketing", "operations", "produit", "tech"].sort(),
    );
    expect(etage.ceo.place).toBeDefined();
    expect(etage.avocat.place).toBeDefined();
    expect(etage.board.sieges).toHaveLength(8);
  });

  it("relie l'ascenseur à chaque siège de l'étage", () => {
    const depart = etage.ascenseur.place;
    const sieges = [
      etage.ceo,
      etage.avocat,
      ...Object.values(etage.chefs),
      ...etage.board.sieges,
      ...etage.invites,
      ...etage.pauses,
    ];
    for (const s of sieges) {
      const t = etage.grille.trajet(depart, s.place);
      expect(t.length, `${s.place.x}, ${s.place.z}`).toBeGreaterThan(0);
    }
  });
});
