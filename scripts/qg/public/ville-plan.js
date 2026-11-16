// Plan de la ville autour de la tour (routes, tours, lampadaires, voitures), sans dépendance à three.js.

export function alea(graine = 1) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function emprise(contour) {
  const xs = contour.map((p) => p[0]);
  const zs = contour.map((p) => p[1]);
  const [x0, x1, z0, z1] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...zs),
    Math.max(...zs),
  ];
  return {
    centre: [(x0 + x1) / 2, (z0 + z1) / 2],
    demi: [(x1 - x0) / 2, (z1 - z0) / 2],
  };
}

// Route axe "x" : elle court le long de x, en z = o. Route axe "z" : le long de z, en x = o.
export function routes({ centre, demi }, rayon, pas = 60) {
  const liste = [];
  const [cx, cz] = centre;
  for (const [axe, c, autre, d0] of [
    ["x", cx, cz, demi[1]],
    ["z", cz, cx, demi[0]],
  ])
    for (let o = d0 + 14; o < rayon - 10; o += pas)
      for (const s of [-1, 1])
        liste.push({
          axe,
          o: autre + s * o,
          c,
          demi: Math.sqrt(rayon * rayon - o * o),
        });
  return liste;
}

const ecart = (r, x, z, l, p) =>
  r.axe === "x" ? Math.abs(z - r.o) - p / 2 : Math.abs(x - r.o) - l / 2;

// Distance entre une tour (boîte l × p centrée en x, z) et un point.
export const distanceBoite = (t, [cx, cz]) =>
  Math.hypot(
    Math.max(Math.abs(t.x - cx) - t.l / 2, 0),
    Math.max(Math.abs(t.z - cz) - t.p / 2, 0),
  );

// Tours de plus en plus hautes en s'éloignant ; côté caméra (sud), plus basses pour ne pas cacher le QG.
// Près de la tour, jamais plus hautes que le plafond (le sommet de la tour ZIK).
export function placerTours(
  n,
  {
    centre,
    degagement = 45,
    rayon = 250,
    voies = [],
    graine = 7,
    plafond = Infinity,
  },
) {
  const r = alea(graine);
  const [cx, cz] = centre;
  const tours = [];
  for (let essai = 0; tours.length < n && essai < n * 40; essai++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(
      r() * (rayon * rayon - degagement * degagement) + degagement ** 2,
    );
    const t = {
      x: cx + Math.cos(a) * d,
      z: cz + Math.sin(a) * d,
      l: 6 + r() * 10,
      p: 6 + r() * 10,
    };
    if (distanceBoite(t, centre) < degagement) continue;
    if (voies.some((v) => ecart(v, t.x, t.z, t.l, t.p) < 6)) continue;
    if (
      tours.some(
        (u) =>
          Math.abs(u.x - t.x) < (u.l + t.l) / 2 + 1.5 &&
          Math.abs(u.z - t.z) < (u.p + t.p) / 2 + 1.5,
      )
    )
      continue;
    const devant = t.z > cz && d < 140 ? 0.55 : 1;
    t.h = (14 + r() * 26) * (1 + (d - degagement) / 80) * devant;
    if (d < 120) t.h = Math.min(t.h, plafond);
    tours.push(t);
  }
  return tours;
}

// Enseigne verticale sur la face tournée vers la tour ZIK.
export function enseigne(t, [cx, cz]) {
  const dx = cx - t.x;
  const dz = cz - t.z;
  const h = Math.min(t.h * 0.45, 18);
  const y = t.h * 0.6;
  if (Math.abs(dx) > Math.abs(dz)) {
    const s = Math.sign(dx);
    return {
      x: t.x + s * (t.l / 2 + 0.1),
      y,
      z: t.z,
      angle: s * (Math.PI / 2),
      h,
    };
  }
  const s = Math.sign(dz) || 1;
  return {
    x: t.x,
    y,
    z: t.z + s * (t.p / 2 + 0.1),
    angle: s > 0 ? 0 : Math.PI,
    h,
  };
}

// Lampadaires des deux côtés de chaque route, sauf dans les carrefours.
export function lampadaires(voies, pas = 22) {
  const liste = [];
  for (const v of voies)
    for (let s = -v.demi + pas / 2; s < v.demi; s += pas) {
      const le = v.c + s;
      const croise = voies.some(
        (w) => w.axe !== v.axe && Math.abs(w.o - le) < 8,
      );
      if (croise) continue;
      for (const cote of [-6, 6])
        liste.push(v.axe === "x" ? [le, v.o + cote] : [v.o + cote, le]);
    }
  return liste;
}

export function voitures(voies, parRoute, graine = 3) {
  const r = alea(graine);
  return voies.flatMap((v, i) =>
    Array.from({ length: parRoute }, () => ({
      route: i,
      sens: r() < 0.5 ? -1 : 1,
      s: (r() * 2 - 1) * v.demi,
      vitesse: 9 + r() * 9,
    })),
  );
}

export function avancer(v, dt, demi) {
  v.s += v.sens * v.vitesse * dt;
  if (v.s > demi) v.s -= 2 * demi;
  if (v.s < -demi) v.s += 2 * demi;
}

// Position d'une voiture sur sa voie (à droite de la route dans son sens) et direction de marche.
export function position(v, route) {
  const le = route.c + v.s;
  return route.axe === "x"
    ? { x: le, z: route.o + v.sens * 1.8, dx: v.sens, dz: 0 }
    : { x: route.o - v.sens * 1.8, z: le, dx: 0, dz: v.sens };
}
