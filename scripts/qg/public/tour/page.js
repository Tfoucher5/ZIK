// Montage de /plans.html : coupe, panneau d'ascenseur, un plan et sa légende par niveau.
import { NIVEAUX, TRAME, lieux } from "./plan.js";
import { alt, dessinerPlan, sousPlafond } from "./dessin.js";
import { dessinerCoupe } from "./coupe.js";
import { nomAgent } from "./trait.js";

const virgule = (n) => n.toFixed(2).replace(".", ",");
const qui = (p) =>
  [...p.occupants.map(nomAgent), p.qui].filter(Boolean).join(", ") || "·";
const ligne = (p) =>
  `<tr><td>${p.nom}</td><td>${p.usage}</td><td>${qui(p)}</td><td>${p.pourquoi}</td></tr>`;

document.getElementById("cCoupe").innerHTML = dessinerCoupe();
const barre = document.querySelector(".asc .w");
const plans = document.getElementById("plans");
for (const n of NIVEAUX) {
  barre.insertAdjacentHTML(
    "beforeend",
    `<button role="tab" id="b-${n.id}" data-n="${n.id}" aria-controls="${n.id}" class="${n.prive ? "prive" : ""}" title="${n.nom} · ${n.theme}">${n.bouton}</button>`,
  );
  plans.insertAdjacentHTML(
    "beforeend",
    `<article class="niv" id="${n.id}" role="tabpanel" aria-labelledby="b-${n.id}" hidden>
  <div class="tt"><h2>${n.nom}<small>${alt(n.z)}</small></h2><span class="mono">${n.theme}</span></div>
  <div class="cadre">${dessinerPlan(n)}</div>
  <div class="aide"><span class="mono">Glisse pour parcourir le plan</span><button type="button" class="zoom">Agrandir</button></div>
  <table class="leg"><thead><tr><th>Pièce</th><th>Usage</th><th>Qui</th><th>Pourquoi ici</th></tr></thead><tbody>${lieux(n).map(ligne).join("")}</tbody></table></article>`,
  );
}
document.getElementById("alt").innerHTML = [...NIVEAUX]
  .reverse()
  .map(
    (n) =>
      `<tr><td>${n.nom} · ${n.theme.split(" · ")[0]}</td><td>${alt(n.z)}</td><td>${n.facade === false ? "plateforme à +38,00" : `${sousPlafond(n)} m`}</td><td>${virgule(TRAME.largeur - n.x0)} × ${virgule(TRAME.profondeur)}</td><td>${n.surface}</td><td>${n.matieres}</td></tr>`,
  )
  .join("");

function va(id, defile) {
  if (!NIVEAUX.some((n) => n.id === id)) id = "n0";
  for (const n of NIVEAUX) {
    document.getElementById(n.id).hidden = n.id !== id;
    document
      .getElementById(`b-${n.id}`)
      .setAttribute("aria-selected", n.id === id);
  }
  history.replaceState(null, "", `#${id}`);
  if (defile) document.querySelector(".asc").scrollIntoView();
}
document.addEventListener("click", (e) => {
  const n = e.target.closest("[data-n]");
  if (n) return va(n.dataset.n, true);
  const z = e.target.closest(".zoom");
  if (z) {
    const c = z.closest(".niv").querySelector(".cadre");
    z.textContent = c.classList.toggle("grand") ? "Réduire" : "Agrandir";
  }
});
va(location.hash.slice(1) || "n3");
