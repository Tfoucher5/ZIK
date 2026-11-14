// Grille de passage du plateau et calcul de trajet (A*), sans dépendance à three.js.
export class Grille {
  constructor(xmin, xmax, zmin, zmax, pas = 0.5) {
    Object.assign(this, { xmin, zmin, pas });
    this.l = Math.ceil((xmax - xmin) / pas);
    this.h = Math.ceil((zmax - zmin) / pas);
    this.bloc = new Uint8Array(this.l * this.h);
  }

  case(x, z) {
    return [
      Math.floor((x - this.xmin) / this.pas),
      Math.floor((z - this.zmin) / this.pas),
    ];
  }

  centre(i, j) {
    return {
      x: this.xmin + (i + 0.5) * this.pas,
      z: this.zmin + (j + 0.5) * this.pas,
    };
  }

  libre(i, j) {
    return (
      i >= 0 && j >= 0 && i < this.l && j < this.h && !this.bloc[j * this.l + i]
    );
  }

  // Bloque un rectangle (centre, largeur, profondeur), avec une marge pour le corps des personnages.
  bloquer(x, z, lx, lz, marge = 0.3) {
    const [i0, j0] = this.case(x - lx / 2 - marge, z - lz / 2 - marge);
    const [i1, j1] = this.case(x + lx / 2 + marge, z + lz / 2 + marge);
    for (let j = Math.max(j0, 0); j <= Math.min(j1, this.h - 1); j++)
      for (let i = Math.max(i0, 0); i <= Math.min(i1, this.l - 1); i++)
        this.bloc[j * this.l + i] = 1;
  }

  // Bloque tout ce qui est hors du contour du bâtiment (polygone [[x, z], ...]).
  masque(contour) {
    for (let j = 0; j < this.h; j++)
      for (let i = 0; i < this.l; i++) {
        const { x, z } = this.centre(i, j);
        if (!dedans(contour, x, z)) this.bloc[j * this.l + i] = 1;
      }
  }

  // Bloque un segment quelconque (mur en biais) avec une marge de chaque côté.
  segment(x0, z0, x1, z1, marge = 0.25) {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (this.pas / 2));
    const r = Math.ceil(marge / this.pas);
    for (let k = 0; k <= n; k++) {
      const [i, j] = this.case(
        x0 + ((x1 - x0) * k) / n,
        z0 + ((z1 - z0) * k) / n,
      );
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          const [a, b] = [i + di, j + dj];
          if (
            a >= 0 &&
            b >= 0 &&
            a < this.l &&
            b < this.h &&
            Math.hypot(di, dj) * this.pas <= marge + this.pas / 2
          )
            this.bloc[b * this.l + a] = 1;
        }
    }
  }

  liberer(x, z, r = 0.4) {
    const [i0, j0] = this.case(x - r, z - r);
    const [i1, j1] = this.case(x + r, z + r);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++)
        if (i >= 0 && j >= 0 && i < this.l && j < this.h)
          this.bloc[j * this.l + i] = 0;
  }

  // Case libre la plus proche (un siège peut être collé à un meuble).
  proche(i, j) {
    for (let r = 0; r < 12; r++)
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++)
          if (
            Math.max(Math.abs(di), Math.abs(dj)) === r &&
            this.libre(i + di, j + dj)
          )
            return [i + di, j + dj];
    return [i, j];
  }

  // Ligne droite praticable entre deux cases, en gardant une petite marge autour du corps.
  vue(a, b) {
    const p = this.centre(...a);
    const q = this.centre(...b);
    const n = Math.ceil((Math.hypot(q.x - p.x, q.z - p.z) / this.pas) * 4);
    const e = this.pas * 0.3;
    for (let k = 1; k < n; k++) {
      const x = p.x + ((q.x - p.x) * k) / n;
      const z = p.z + ((q.z - p.z) * k) / n;
      for (const [dx, dz] of [
        [-e, -e],
        [e, -e],
        [-e, e],
        [e, e],
      ])
        if (!this.libre(...this.case(x + dx, z + dz))) return false;
    }
    return true;
  }

  // Trajet lissé de a à b ({x, z}) ; le point d'arrivée exact est ajouté à la fin.
  trajet(a, b) {
    const dep = this.proche(...this.case(a.x, a.z));
    const arr = this.proche(...this.case(b.x, b.z));
    const cle = (i, j) => j * this.l + i;
    const h = (i, j) => Math.hypot(i - arr[0], j - arr[1]);
    const g = new Map([[cle(...dep), 0]]);
    const venu = new Map();
    const ouverts = new Tas();
    ouverts.mettre([h(...dep), ...dep]);
    const fermes = new Set();
    let trouve = false;
    while (ouverts.taille) {
      const [, i, j] = ouverts.prendre();
      const c = cle(i, j);
      if (fermes.has(c)) continue;
      fermes.add(c);
      if (i === arr[0] && j === arr[1]) {
        trouve = true;
        break;
      }
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if ((!di && !dj) || !this.libre(i + di, j + dj)) continue;
          if (di && dj && (!this.libre(i + di, j) || !this.libre(i, j + dj)))
            continue;
          const n = cle(i + di, j + dj);
          const cout = g.get(c) + (di && dj ? Math.SQRT2 : 1);
          if (cout < (g.get(n) ?? Infinity)) {
            g.set(n, cout);
            venu.set(n, c);
            ouverts.mettre([cout + h(i + di, j + dj), i + di, j + dj]);
          }
        }
    }
    if (!trouve) return [{ x: b.x, z: b.z }];
    const cases = [];
    for (let c = cle(...arr); c !== undefined; c = venu.get(c))
      cases.unshift([c % this.l, Math.floor(c / this.l)]);
    const lisse = [cases[0]];
    for (let k = 1; k < cases.length; k++)
      if (
        k === cases.length - 1 ||
        !this.vue(lisse[lisse.length - 1], cases[k + 1])
      )
        lisse.push(cases[k]);
    return [
      ...lisse.slice(1).map(([i, j]) => this.centre(i, j)),
      { x: b.x, z: b.z },
    ];
  }
}

export function dedans(contour, x, z) {
  let oui = false;
  for (let k = 0, m = contour.length - 1; k < contour.length; m = k++) {
    const [xa, za] = contour[k];
    const [xb, zb] = contour[m];
    if (za > z !== zb > z && x < ((xb - xa) * (z - za)) / (zb - za) + xa)
      oui = !oui;
  }
  return oui;
}

// File de priorité (tas binaire) sur le premier élément.
class Tas {
  t = [];
  get taille() {
    return this.t.length;
  }
  mettre(v) {
    const t = this.t;
    t.push(v);
    for (let k = t.length - 1; k > 0;) {
      const p = (k - 1) >> 1;
      if (t[p][0] <= t[k][0]) break;
      [t[p], t[k]] = [t[k], t[p]];
      k = p;
    }
  }
  prendre() {
    const t = this.t;
    const haut = t[0];
    const bas = t.pop();
    if (t.length) {
      t[0] = bas;
      for (let k = 0; ;) {
        const [a, b] = [2 * k + 1, 2 * k + 2];
        let m = k;
        if (a < t.length && t[a][0] < t[m][0]) m = a;
        if (b < t.length && t[b][0] < t[m][0]) m = b;
        if (m === k) break;
        [t[m], t[k]] = [t[k], t[m]];
        k = m;
      }
    }
    return haut;
  }
}
