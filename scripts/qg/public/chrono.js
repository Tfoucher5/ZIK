// Chronologie des 30 dernières minutes : une piste par instance, un segment par action, coloré par famille.
import { FAMILLES, couleur, segments } from "./familles.js";

const FENETRE = 30 * 60e3;
const zone = document.getElementById("chrono");
document.getElementById("legende").innerHTML = Object.entries(FAMILLES)
  .map(([f, nom]) => `<span style="--c:${couleur(f)}"><i></i>${nom}</span>`)
  .join("");

export function majChrono(etat, instances) {
  const m = etat.maintenant;
  const debut = m - FENETRE;
  const pos = (t) => Math.max(0, Math.min(100, ((t - debut) / FENETRE) * 100));
  const actives = new Map(instances.map((x) => [x.cle, x]));
  const pistes = [
    ...instances.filter((x) => x.traces.length),
    ...etat.agents
      .filter((a) => !actives.has(a.agentId) && a.traces.length)
      .map((a) => ({ cle: a.agentId, titre: a.type, traces: a.traces })),
  ].slice(0, 14);
  const echelle = [30, 20, 10, 0]
    .map(
      (min) =>
        `<span style="left:${100 - (min / 30) * 100}%">${min ? `−${min} min` : "maintenant"}</span>`,
    )
    .join("");
  const html = pistes.map((x) => {
    const barres = segments(x.traces, m, actives.has(x.cle))
      .filter((s) => s.t1 > debut)
      .map((s) => {
        const g = pos(s.t0);
        return `<i style="left:${g}%;width:${Math.max(0.4, pos(s.t1) - g)}%;--c:${couleur(s.f)}"></i>`;
      })
      .join("");
    return `<div class="piste${actives.has(x.cle) ? " active" : ""}"><span class="qui"></span><div class="barres">${barres}</div></div>`;
  });
  zone.innerHTML =
    `<div class="axe"><span></span><div class="ech">${echelle}</div></div>` +
    (html.length
      ? html.join("")
      : '<p class="vide">Aucune action depuis 30 minutes.</p>');
  zone.querySelectorAll(".qui").forEach((el, k) => {
    el.textContent = pistes[k].titre;
  });
}
