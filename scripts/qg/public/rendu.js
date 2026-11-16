import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const AMBIANCES = {
  nuit: {
    haut: "#04030c",
    horizon: "#2b1352",
    bas: "#07060f",
    brume: "#160c2c",
    densite: 0.0042,
    bloom: 0.55,
    exposition: 1.15,
  },
  crepuscule: {
    haut: "#1d2b63",
    horizon: "#ff9a4d",
    bas: "#2a1830",
    brume: "#7a4a5e",
    densite: 0.0026,
    bloom: 0.4,
    exposition: 1,
  },
};

const VIGNETTE = {
  uniforms: { tDiffuse: { value: null }, force: { value: 0.4 } },
  vertexShader: `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float force; varying vec2 vUv;
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  c.rgb *= 1.0 - force * smoothstep(0.3, 0.85, distance(vUv, vec2(0.5)));
  gl_FragColor = c;
}`,
};

// Dôme dégradé qui suit la caméra : le ciel reste à l'infini quel que soit le cadrage.
function dome() {
  const u = {
    haut: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    bas: { value: new THREE.Color() },
  };
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(450, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: u,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 haut; uniform vec3 horizon; uniform vec3 bas; varying vec3 vDir;
void main() {
  float h = normalize(vDir).y;
  vec3 c = h > 0.0 ? mix(horizon, haut, pow(h, 0.55)) : mix(horizon, bas, min(1.0, -h * 5.0));
  gl_FragColor = vec4(c, 1.0);
}`,
    }),
  );
  m.renderOrder = -1;
  m.frustumCulled = false;
  m.userData.garder = true;
  return { m, u };
}

export function creerRendu(renderer, scene, camera) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cible = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, cible);
  composer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1.5));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1, 0.4, 0.92);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass(VIGNETTE));
  const ciel = dome();
  scene.add(ciel.m);
  scene.background = null;
  scene.fog = new THREE.FogExp2("#000000", 0);

  return {
    render() {
      ciel.m.position.copy(camera.position);
      composer.render();
    },
    taille(l, h) {
      composer.setSize(l, h);
    },
    nuit(oui) {
      const a = AMBIANCES[oui ? "nuit" : "crepuscule"];
      for (const k of ["haut", "horizon", "bas"]) ciel.u[k].value.set(a[k]);
      scene.fog.color.set(a.brume);
      scene.fog.density = a.densite;
      bloom.strength = a.bloom;
      renderer.toneMappingExposure = a.exposition;
    },
  };
}
