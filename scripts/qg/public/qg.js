import { Scene3D } from "./scene.js";

const $ = (id) => document.getElementById(id);
const nombre = (n) =>
  n >= 1e6
    ? `${(n / 1e6).toFixed(1)} M`
    : n >= 1e3
      ? `${(n / 1e3).toFixed(0)} k`
      : String(Math.round(n));
const dollars = (n) => `${n.toFixed(2)} $`;
const heure = (t) =>
  new Date(t).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

let org = { chefs: [], board: [] };
let etat = null;
let selection = null;
const scene = new Scene3D($("scene"), (id) => {
  selection = id;
  fiche();
});

function noeudDe(type) {
  if (type.startsWith("chef-")) return type.slice(5);
  if (org.board.includes(type)) return type;
  if (org.chefs.some((c) => c.equipe.includes(type))) return type;
  return "renforts";
}

function chefDe(noeud) {
  return org.chefs.find((c) => c.id === noeud || c.equipe.includes(noeud));
}

function activite() {
  const a = new Map();
  const nb = new Map();
  const ajoute = (id, texte) => {
    nb.set(id, (nb.get(id) ?? 0) + 1);
    if (!a.has(id)) a.set(id, texte || "au travail");
    const chef = chefDe(id);
    if (chef && chef.id !== id && !a.has(chef.id))
      a.set(chef.id, `pilote ${id}`);
  };
  for (const s of etat.sessions.filter((s) => s.actif)) {
    a.set("ceo", s.activite || "réfléchit");
    const skill = s.skill?.split(":").pop();
    if (org.chefs.some((c) => c.id === skill)) ajoute(skill, s.activite);
  }
  for (const ag of etat.agents.filter((x) => x.actif)) {
    const id = noeudDe(ag.type);
    ajoute(
      id,
      id === "renforts"
        ? `${ag.type} · ${ag.activite}`
        : ag.activite || ag.description,
    );
  }
  for (const l of etat.enAttente)
    ajoute(noeudDe(l.type), `lancement : ${l.description}`);
  for (const [id, n] of nb)
    if (n > 1 && id !== "renforts") a.set(id, `×${n} · ${a.get(id)}`);
  if (a.size) a.set("theo", "supervise");
  return { a, nb };
}

function compteurs(actifs) {
  $("c-cout").textContent = dollars(etat.aujourdhui.cout);
  $("c-tokens").textContent = nombre(etat.aujourdhui.tokens);
  $("c-agents").textContent = etat.agents.filter((x) => x.actif).length;
  $("c-sessions").textContent = etat.sessions.filter((s) => s.actif).length;
  const enSeance = [...actifs.keys()].filter(
    (id) =>
      org.board.includes(id) ||
      org.chefs.some(
        (c) =>
          c.id === id &&
          etat.agents.some((x) => x.actif && x.type === `chef-${id}`),
      ),
  );
  $("board").hidden = enSeance.length < 3;
  return enSeance.length >= 3 ? enSeance : [];
}

function listes() {
  $("flux").replaceChildren(
    ...etat.flux.map((e) => {
      const li = document.createElement("li");
      li.innerHTML = `<time></time><b></b><span></span>`;
      li.children[0].textContent = heure(e.t);
      li.children[1].textContent = e.qui;
      li.children[2].textContent = e.quoi;
      return li;
    }),
  );
  $("sessions").replaceChildren(
    ...etat.sessions.map((s) => {
      const li = document.createElement("li");
      li.className = s.actif ? "actif" : "";
      li.innerHTML = `<span></span><span></span>`;
      li.children[0].textContent = `${s.projet} · ${s.branche}${s.skill ? ` · /${s.skill}` : ""}`;
      li.children[1].textContent = dollars(s.cout);
      return li;
    }),
  );
}

function fiche() {
  const f = $("fiche");
  if (!selection || !etat) return (f.hidden = true);
  const chef = org.chefs.find((c) => c.id === selection);
  const types =
    selection === "ceo"
      ? []
      : chef
        ? [...chef.equipe, `chef-${chef.id}`]
        : null;
  const runs = etat.agents.filter((a) =>
    types ? types.includes(a.type) : noeudDe(a.type) === selection,
  );
  const sessions = selection === "ceo" ? etat.sessions : [];
  const somme = (cle) => [...runs, ...sessions].reduce((t, x) => t + x[cle], 0);
  f.hidden = false;
  f.innerHTML = `<h3></h3><dl><dt>Missions</dt><dd></dd><dt>Tokens</dt><dd></dd><dt>Coût</dt><dd></dd></dl><ul></ul>`;
  f.querySelector("h3").textContent = chef?.nom ?? selection;
  const dd = f.querySelectorAll("dd");
  dd[0].textContent =
    selection === "ceo"
      ? `${sessions.length} sessions`
      : `${runs.length} (${runs.filter((r) => r.actif).length} en cours)`;
  dd[1].textContent = nombre(somme("tokens"));
  dd[2].textContent = dollars(somme("cout"));
  f.querySelector("ul").replaceChildren(
    ...runs.slice(0, 6).map((r) => {
      const li = document.createElement("li");
      li.textContent = `${heure(r.debut)} · ${r.type} · ${r.description}${r.actif ? " (en cours)" : ""}`;
      return li;
    }),
  );
}

function rafraichir() {
  const { a, nb } = activite();
  scene.maj(a, nb, compteurs(a));
  listes();
  fiche();
}

// Affichage : pièces, agents, activité, panneaux ; chaque panneau se replie. Réglages gardés dans le navigateur.
const memoire = {
  lire: () => {
    try {
      return JSON.parse(localStorage.getItem("qg-affichage")) ?? {};
    } catch {
      return {};
    }
  },
  ecrire: (v) => {
    try {
      localStorage.setItem("qg-affichage", JSON.stringify(v));
    } catch {
      /* navigation privée */
    }
  },
};
const reglages = memoire.lire();
function appliquer() {
  for (const b of document.querySelectorAll("[data-bascule]")) {
    const off = !!reglages[b.dataset.bascule];
    document.body.classList.toggle(b.dataset.bascule, off);
    b.setAttribute("aria-pressed", String(!off));
  }
  for (const p of document.querySelectorAll(".panneau")) {
    const replie = !!reglages[`replie-${p.classList[2]}`];
    p.classList.toggle("replie", replie);
    p.querySelector(".plier").setAttribute("aria-expanded", String(!replie));
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-bascule]");
  const p = e.target.closest(".plier")?.closest(".panneau");
  if (b) reglages[b.dataset.bascule] = !reglages[b.dataset.bascule];
  else if (p)
    reglages[`replie-${p.classList[2]}`] =
      !reglages[`replie-${p.classList[2]}`];
  else return;
  memoire.ecrire(reglages);
  appliquer();
});
appliquer();

org = await (await fetch("/organigramme")).json();
scene.construire(org);
const flux = new EventSource("/flux");
flux.onopen = () => {
  $("liaison").textContent = "en direct";
  $("liaison").className = "liaison ok";
};
flux.onerror = () => {
  $("liaison").textContent = "serveur arrêté ?";
  $("liaison").className = "liaison";
};
flux.onmessage = (e) => {
  etat = JSON.parse(e.data);
  rafraichir();
};
