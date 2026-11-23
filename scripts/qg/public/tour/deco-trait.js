// Déco sur le plan : petits symboles discrets en magenta, contre les murs ou dans les angles.
import { DECO, FACES, taille } from "./deco.js";

const TRAIT =
  ' fill="none" stroke="var(--mag)" stroke-width=".35" opacity=".7"';

// Symbole de chaque type : murs en trait le long du mur, objets posés en petite forme.
export const SYMBOLES = {
  mural: (t, e, [dx, dy]) => {
    const { l } = taille(e);
    const [ux, uy] = [Math.abs(dy), Math.abs(dx)];
    const [x, y] = [e.x + dx * 0.12, e.y + dy * 0.12];
    t.P(
      `<line x1="${t.f(x - (ux * l) / 2)}" y1="${t.f(y - (uy * l) / 2)}" x2="${t.f(x + (ux * l) / 2)}" y2="${t.f(y + (uy * l) / 2)}"${TRAIT}/>`,
    );
    if (e.type === "vinyles")
      for (const k of [-1, 0, 1])
        t.P(
          `<circle cx="${t.f(x + dx * 0.25 + (ux * k * l) / 3)}" cy="${t.f(y + dy * 0.25 + (uy * k * l) / 3)}" r="1.5"${TRAIT}/>`,
        );
  },
  tapis: (t, e) =>
    t.P(
      `<rect x="${t.f(e.x - e.l / 2)}" y="${t.f(e.y - e.p / 2)}" width="${t.f(e.l)}" height="${t.f(e.p)}" stroke-dasharray="1.5 1"${TRAIT}/>`,
    ),
  pose: (t, e) => {
    const r = taille(e).l / 2;
    t.P(
      e.type === "plante" || e.type === "trophee"
        ? `<circle cx="${t.f(e.x)}" cy="${t.f(e.y)}" r="${t.f(r)}"${TRAIT}/>`
        : `<rect x="${t.f(e.x - r)}" y="${t.f(e.y - r)}" width="${t.f(2 * r)}" height="${t.f(2 * r)}"${TRAIT}/>`,
    );
  },
};

export const symbole = (e) =>
  e.type === "tapis" ? "tapis" : e.sol ? "pose" : "mural";

export function decoPlan(t, n) {
  for (const e of DECO[n.id] ?? []) SYMBOLES[symbole(e)](t, e, FACES[e.face]);
}
