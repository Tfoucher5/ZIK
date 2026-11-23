// Indicateurs du haut, flux en direct filtrable, chantiers.
import { famille, icone, couleur } from "./familles.js";
import { heure } from "./equipe.js";

const $ = (id) => document.getElementById(id);
const el = (tag, texte, classe) => {
  const n = document.createElement(tag);
  if (texte != null) n.textContent = texte;
  if (classe) n.className = classe;
  return n;
};
const jourHeure = (t) => {
  const d = new Date(t);
  return d.toDateString() === new Date().toDateString()
    ? heure(t)
    : `${d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" })} ${heure(t)}`;
};
const lire = async (url) => {
  try {
    return await (await fetch(url)).json();
  } catch {
    return null;
  }
};

function chiffre(id, valeur) {
  const n = $(id);
  if (n.textContent === String(valeur)) return;
  n.textContent = valeur;
  n.classList.remove("bump");
  void n.offsetWidth;
  n.classList.add("bump");
}

let limites = null;
function fenetre(cle, f, m, repli) {
  const jauge = $(`g-${cle}`);
  const fini = f && (!f.resets_at || f.resets_at * 1000 <= m);
  if (!f) {
    $(`k-${cle}`).textContent = "–";
    jauge.querySelector("i").style.width = "0";
    $(`r-${cle}`).textContent = repli;
    return;
  }
  const pct = fini ? 0 : Math.min(100, Math.round(f.used_percentage));
  $(`k-${cle}`).textContent = pct;
  jauge.querySelector("i").style.width = `${pct}%`;
  jauge.dataset.n = pct >= 90 ? "rouge" : pct >= 70 ? "orange" : "";
  $(`r-${cle}`).textContent = fini
    ? "remise à zéro faite"
    : `remise à zéro ${jourHeure(f.resets_at * 1000)}`;
}

function majIndicateurs(etat, instances) {
  const m = etat.maintenant;
  const agents = instances.filter((x) => x.role !== "Claude").length;
  chiffre("k-actifs", instances.length);
  $("k-detail").textContent = !instances.length
    ? "personne au travail"
    : agents
      ? `Claude + ${agents} agent${agents > 1 ? "s" : ""}`
      : "Claude seul";
  chiffre("k-dev", instances.filter((x) => x.role === "dev").length);
  chiffre("k-pr", etat.prFusionnees);
  const l = etat.limite;
  const estimation = l.atteinte
    ? `atteinte · reprise ${jourHeure(l.fin)}`
    : l.debut
      ? `estimée : remise à zéro vers ${heure(l.fin)}`
      : "aucune fenêtre ouverte";
  fenetre("5", limites?.five_hour, m, estimation);
  fenetre("7", limites?.seven_day, m, "barre d'état absente (README)");
}

// Flux : on n'ajoute que les nouvelles lignes, pour qu'elles glissent en place.
let filtre = "tout";
const FILTRES = [
  ["tout", "Tout"],
  ["ecrit", "Code"],
  ["tests", "Tests"],
  ["git", "Git et PR"],
  ["question", "Questions"],
];
$("filtres").innerHTML = FILTRES.map(
  ([f, nom]) =>
    `<button type="button" data-f="${f}" aria-pressed="${f === "tout"}">${nom}</button>`,
).join("");
$("filtres").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  filtre = b.dataset.f;
  for (const x of $("filtres").children)
    x.setAttribute("aria-pressed", String(x === b));
  for (const li of $("flux").children)
    li.hidden = filtre !== "tout" && li.dataset.f !== filtre;
});

const vus = new Set();
function majFlux(etat, instances) {
  const titres = new Map(instances.map((x) => [x.cle, x.titre]));
  const nouveaux = etat.flux
    .filter((e) => !vus.has(`${e.t}|${e.cle}|${e.quoi}`))
    .reverse();
  for (const e of nouveaux) {
    vus.add(`${e.t}|${e.cle}|${e.quoi}`);
    const f = e.cible ? "pense" : famille(e.quoi);
    const li = el("li");
    li.dataset.f = f;
    li.style.setProperty("--fam", couleur(f));
    li.innerHTML = `<time>${heure(e.t)}</time>${icone(f)}<p><b></b> <span></span></p>`;
    li.querySelector("b").textContent = titres.get(e.cle) ?? e.qui;
    li.querySelector("span").textContent = e.cible
      ? `Lance ${e.cible} : ${e.quoi}`
      : e.quoi;
    li.hidden = filtre !== "tout" && f !== filtre;
    $("flux").prepend(li);
  }
  while ($("flux").children.length > 80) $("flux").lastChild.remove();
  $("n-flux").textContent = `${$("flux").children.length} actions`;
}

const ETATS = [
  ["en-cours", "En cours"],
  ["a-faire", "Reste à faire"],
  ["fait", "Fait"],
];
async function majChantiers() {
  const liste = await lire("/chantiers");
  if (!liste) return;
  const zone = $("chantiers");
  if (!liste.length)
    return zone.replaceChildren(
      el("p", "Aucun chantier dans docs/strategie/chantiers.md.", "vide"),
    );
  zone.replaceChildren(
    ...ETATS.filter(([cle]) => liste.some((c) => c.etat === cle)).map(
      ([cle, nom]) => {
        const items = liste.filter((c) => c.etat === cle);
        const groupe = el(cle === "fait" ? "details" : "div", null, "groupe");
        groupe.append(
          el(cle === "fait" ? "summary" : "h3", `${nom} (${items.length})`),
        );
        const ul = el("ul");
        for (const c of items) {
          const li = el("li");
          li.dataset.etat = cle;
          li.append(el("b", c.titre));
          const infos = [c.equipe, c["prochaine etape"]].filter(Boolean);
          if (infos.length) li.append(el("small", infos.join(" · ")));
          ul.append(li);
        }
        groupe.append(ul);
        return groupe;
      },
    ),
  );
}

let dernier = null;
export function majTableau(etat, instances) {
  dernier = [etat, instances];
  majIndicateurs(etat, instances);
  majFlux(etat, instances);
}
async function majLimites() {
  limites = await lire("/limites");
  if (dernier) majIndicateurs(...dernier);
}
majLimites();
majChantiers();
setInterval(majLimites, 15e3);
setInterval(majChantiers, 10e3);
