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

  vue(a, b) {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
    for (let k = 1; k < n; k++) {
      const i = Math.round(a[0] + ((b[0] - a[0]) * k) / n);
      const j = Math.round(a[1] + ((b[1] - a[1]) * k) / n);
      if (!this.libre(i, j)) return false;
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
    const ouverts = [[h(...dep), ...dep]];
    const fermes = new Set();
    let trouve = false;
    while (ouverts.length) {
      let m = 0;
      for (let k = 1; k < ouverts.length; k++)
        if (ouverts[k][0] < ouverts[m][0]) m = k;
      const [, i, j] = ouverts.splice(m, 1)[0];
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
            ouverts.push([cout + h(i + di, j + dj), i + di, j + dj]);
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
