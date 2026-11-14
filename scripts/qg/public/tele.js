import * as THREE from "three";

const POLICE = '"Barlow Condensed", "Arial Narrow", sans-serif';

// Télé murale d'une salle : noire au repos, elle affiche la réunion en cours (qui parle de quoi, un égaliseur ZIK).
export class Tele {
  constructor(couleur, nom, l = 1.6, h = 0.9) {
    Object.assign(this, { couleur, nom, lignes: [], allumee: false, t: 0 });
    this.toile = document.createElement("canvas");
    this.toile.width = 512;
    this.toile.height = Math.round((512 * h) / l);
    this.texture = new THREE.CanvasTexture(this.toile);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(l, h),
      new THREE.MeshStandardMaterial({
        color: "#000000",
        emissive: "#ffffff",
        emissiveMap: this.texture,
        emissiveIntensity: 1,
      }),
    );
    this.dessiner();
  }

  allumer(titre, lignes) {
    const avant = this.allumee;
    this.allumee = true;
    this.titre = titre;
    this.lignes = lignes;
    if (!avant) this.dessiner();
  }

  eteindre() {
    if (!this.allumee) return;
    this.allumee = false;
    this.dessiner();
  }

  animer(dt) {
    if (!this.allumee) return;
    this.t += dt;
    if (this.t < 0.2) return;
    this.t = 0;
    this.dessiner();
  }

  dessiner() {
    const c = this.toile.getContext("2d");
    const { width: w, height: h } = this.toile;
    c.fillStyle = "#050507";
    c.fillRect(0, 0, w, h);
    if (this.allumee) {
      const fond = c.createLinearGradient(0, 0, w, h);
      fond.addColorStop(0, "#14141f");
      fond.addColorStop(1, this.couleur + "55");
      c.fillStyle = fond;
      c.fillRect(0, 0, w, h);
      c.fillStyle = this.couleur;
      c.fillRect(0, 0, w, 44);
      c.fillStyle = "#0a0d14";
      c.font = `700 30px ${POLICE}`;
      c.fillText(this.nom.toUpperCase(), 16, 32);
      c.textAlign = "right";
      c.fillText("● EN COURS", w - 16, 32);
      c.textAlign = "left";
      c.fillStyle = "#ffffff";
      c.font = `700 34px ${POLICE}`;
      c.fillText(this.titre, 16, 86, w - 32);
      c.font = `400 24px ${POLICE}`;
      c.fillStyle = "#e5e7eb";
      this.lignes
        .slice(0, 4)
        .forEach((l, k) => c.fillText(l, 16, 122 + k * 28, w - 32));
      const n = 24;
      for (let k = 0; k < n; k++) {
        const v =
          0.25 +
          0.75 *
            Math.abs(
              Math.sin(performance.now() / 260 + k * 0.7) *
                Math.cos(k * 1.3 + performance.now() / 610),
            );
        c.fillStyle = k % 2 ? this.couleur : "#ff00ff";
        c.fillRect(
          16 + (k * (w - 32)) / n,
          h - 12 - v * 50,
          (w - 32) / n - 4,
          v * 50,
        );
      }
    } else {
      c.fillStyle = "rgba(255,255,255,0.05)";
      c.fillRect(w * 0.55, 0, w * 0.2, h);
    }
    this.texture.needsUpdate = true;
  }
}
