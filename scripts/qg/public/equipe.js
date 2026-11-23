// Équipe : une ligne par agent, une carte par instance (dev #1, dev #2…), animée à l'arrivée, au changement d'action et au départ.
import { famille, icone, couleur } from "./familles.js";

const ROLES = [
  ["Claude", "session principale"],
  ["dev", "code en worktree"],
  ["test-writer", "tests"],
  ["reviewer", "relecture"],
  ["recette", "staging"],
  ["produit", "design et textes"],
  ["support", "clients et joueurs"],
  ["marketing", "SEO, promo, ventes"],
  ["juridique", "CGU, RGPD, droits"],
  ["chiffres", "indicateurs, prix"],
  ["incident", "prod"],
];

const zone = document.getElementById("roles");
const lignes = new Map();
const cartes = new Map();
const numeros = new Map();

export const heure = (t) =>
  new Date(t).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
export const duree = (ms) => {
  const s = Math.max(0, Math.round(ms / 1e3));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60
    ? `${m} min`
    : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};

function ligne(role, sous = "agent") {
  let l = lignes.get(role);
  if (l) return l;
  l = document.createElement("div");
  l.className = "role";
  l.innerHTML = `<div class="nom"><b><span></span> <span class="compte">0</span></b><small></small></div><div class="instances"><p class="vide">en veille</p></div>`;
  l.querySelector("b span").textContent = role;
  l.querySelector("small").textContent = sous;
  zone.append(l);
  lignes.set(role, l);
  return l;
}
for (const [role, sous] of ROLES) ligne(role, sous);

// Numéro stable par instance : le plus petit libre pour son rôle.
function numero(role, cle) {
  if (numeros.has(cle)) return numeros.get(cle);
  const pris = new Set(
    [...numeros].filter(([c]) => c.startsWith(`${role}|`)).map(([, n]) => n),
  );
  let n = 1;
  while (pris.has(n)) n++;
  numeros.set(cle, n);
  return n;
}

// Toutes les instances au travail, au même format : sessions, agents, lancements en attente.
export function instancesDe(etat) {
  const liste = [
    ...etat.sessions
      .filter((s) => s.actif)
      .map((s) => ({
        cle: s.id,
        role: "Claude",
        branche: s.branche,
        tache: s.skill ? `/${s.skill.split(":").pop()}` : s.projet,
        activite: s.activite,
        debut: s.traces[0]?.t ?? s.derniere,
        traces: s.traces,
      })),
    ...etat.agents
      .filter((a) => a.actif)
      .map((a) => ({
        cle: a.agentId,
        role: a.type,
        branche: a.branche,
        tache: a.description,
        activite: a.activite,
        debut: a.debut,
        traces: a.traces,
      })),
    ...etat.enAttente.map((l) => ({
      cle: `attente|${l.type}|${l.t}`,
      role: l.type,
      branche: "",
      tache: l.description,
      activite: "Arrive…",
      debut: l.t,
      traces: [],
    })),
  ];
  for (const x of liste) {
    x.n = numero(x.role, `${x.role}|${x.cle}`);
    const seul = liste.filter((y) => y.role === x.role).length === 1;
    x.titre = seul && x.role === "Claude" ? "Claude" : `${x.role} #${x.n}`;
  }
  return liste;
}

function carte(x) {
  const el = document.createElement("article");
  el.className = "carte";
  el.innerHTML = `<div class="l1"><b></b><span class="branche"></span><time></time></div><div class="act"></div><p class="tache"></p><div class="trace"></div><div class="bas"><span class="nb"></span><span class="depuis"></span></div>`;
  el.querySelector("b").textContent = x.titre;
  el.querySelector(".depuis").textContent = `lancé à ${heure(x.debut)}`;
  return el;
}

function remplir(el, x, maintenant) {
  const f = famille(x.activite);
  el.style.setProperty("--fam", couleur(f));
  el.querySelector("b").textContent = x.titre;
  el.querySelector(".branche").textContent = x.branche || "";
  el.querySelector("time").textContent = duree(maintenant - x.debut);
  el.querySelector(".tache").textContent = x.tache || "";
  const act = el.querySelector(".act");
  if (act.dataset.quoi !== x.activite) {
    act.dataset.quoi = x.activite;
    act.dataset.f = f;
    act.innerHTML = `${icone(f)}<span></span>`;
    act.querySelector("span").textContent = x.activite || "Réfléchit";
    act.classList.remove("change");
    void act.offsetWidth;
    act.classList.add("change");
  }
  el.querySelector(".trace").innerHTML = x.traces
    .slice(-24)
    .map((tr) => `<i style="--c:${couleur(famille(tr.quoi))}"></i>`)
    .join("");
  const n = x.traces.length;
  el.querySelector(".nb").textContent = `${n} action${n > 1 ? "s" : ""}`;
}

export function majEquipe(etat) {
  const liste = instancesDe(etat);
  const vues = new Set();
  for (const x of liste) {
    vues.add(x.cle);
    let el = cartes.get(x.cle);
    const hote = ligne(x.role).querySelector(".instances");
    if (!el) {
      el = carte(x);
      hote.querySelector(".vide")?.remove();
      hote.append(el);
      cartes.set(x.cle, el);
    }
    remplir(el, x, etat.maintenant);
  }
  for (const [cle, el] of cartes) {
    if (vues.has(cle)) continue;
    cartes.delete(cle);
    for (const k of numeros.keys())
      if (k.endsWith(`|${cle}`)) numeros.delete(k);
    el.classList.add("part");
    setTimeout(() => el.remove(), 400);
  }

  const derniere = new Map();
  for (const a of etat.agents)
    if (!a.actif)
      derniere.set(a.type, Math.max(derniere.get(a.type) ?? 0, a.derniere));
  const actifs = new Set(liste.map((x) => x.role));
  for (const [role, l] of lignes) {
    const n = liste.filter((x) => x.role === role).length;
    l.classList.toggle("actif", n > 0);
    l.querySelector(".compte").textContent = n > 1 ? `×${n}` : String(n);
    const hote = l.querySelector(".instances");
    setTimeout(() => {
      if (hote.querySelector(".carte:not(.part)")) return;
      const p = hote.querySelector(".vide") ?? document.createElement("p");
      p.className = "vide";
      p.textContent = derniere.get(role)
        ? `en veille · dernière mission à ${heure(derniere.get(role))}`
        : "en veille";
      if (!p.parentNode) hote.replaceChildren(p);
    }, 420);
  }
  // Rôles au travail en haut ; on ne déplace le DOM que si l'ordre change.
  const ordre = [...lignes.keys()].sort(
    (a, b) => actifs.has(b) - actifs.has(a),
  );
  const actuel = [...zone.children].map(
    (el) => [...lignes].find(([, l]) => l === el)?.[0],
  );
  if (ordre.join() !== actuel.join())
    for (const r of ordre) zone.append(lignes.get(r));
  return liste;
}
