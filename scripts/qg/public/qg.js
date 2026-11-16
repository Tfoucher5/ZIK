import { majTableau, heure } from "./tableau.js";

const $ = (id) => document.getElementById(id);

let org = { chefs: [], board: [] };
let etat = null;
let selection = null;
// La 3D est chargée à part : si elle échoue (CDN, WebGL), le tableau de bord reste utilisable.
let scene = null;
try {
  const { Scene3D } = await import("./scene.js");
  scene = new Scene3D($("scene"), (id) => {
    selection = id;
    fiche();
  });
} catch (e) {
  console.error("3D indisponible", e);
}

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

function seance(actifs) {
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
  f.hidden = false;
  f.innerHTML = `<h3></h3><p></p><ul></ul>`;
  f.querySelector("h3").textContent = chef?.nom ?? selection;
  f.querySelector("p").textContent =
    selection === "ceo"
      ? `${etat.sessions.length} sessions`
      : `${runs.length} missions (${runs.filter((r) => r.actif).length} en cours)`;
  f.querySelector("ul").replaceChildren(
    ...runs.slice(0, 6).map((r) => {
      const li = document.createElement("li");
      li.textContent = `${heure(r.debut)} · ${r.type} · ${r.description}${r.actif ? " (en cours)" : ""}`;
      return li;
    }),
  );
}

// Une erreur de la 3D ne doit pas figer le tableau de bord.
function en3D(fn) {
  try {
    if (scene) fn(scene);
  } catch (e) {
    console.error("3D", e);
  }
}

// Chantiers et décisions à trancher, affichés aussi dans le penthouse de Théo.
const docs = { chantiers: [], aTrancher: [], limites: null };
async function majDocs() {
  try {
    const [c, t, l] = await Promise.all(
      ["/chantiers", "/a-trancher", "/limites"].map((u) =>
        fetch(u).then((r) => r.json()),
      ),
    );
    Object.assign(docs, { chantiers: c, aTrancher: t, limites: l });
  } catch {
    return; // serveur arrêté : on garde les dernières données
  }
  if (etat) penthouse();
}
function penthouse() {
  const par = (e) => docs.chantiers.filter((c) => c.etat === e).length;
  const l = docs.limites;
  en3D((s) =>
    s.donnees({
      limite: l && {
        cinqHeures: l.five_hour?.used_percentage,
        semaine: l.seven_day?.used_percentage,
      },
      chantiers: {
        enCours: par("en-cours"),
        aFaire: par("a-faire"),
        fait: par("fait"),
      },
      aTrancher: docs.aTrancher.filter((d) => !d.envoye).length,
      agentsActifs: etat.agents.filter((x) => x.actif).length,
      heure: new Date(etat.maintenant),
    }),
  );
}

function rafraichir() {
  const { a, nb } = activite();
  const enSeance = seance(a);
  majTableau(etat, org);
  en3D((s) => s.maj(a, nb, enSeance));
  penthouse();
  fiche();
}

// Ascenseur : boutons et touches 1, 2, 3 ; « Ville » montre toute la tour.
const boutons = [...document.querySelectorAll("[data-etage]")];
function etage(choix) {
  en3D((s) => s.voir(choix));
  for (const b of boutons)
    b.setAttribute("aria-pressed", String(b.dataset.etage === String(choix)));
}
if (scene) {
  $("ascenseur").hidden = false;
  for (const b of boutons)
    b.addEventListener("click", () =>
      etage(b.dataset.etage === "ville" ? "ville" : Number(b.dataset.etage)),
    );
  addEventListener("keydown", (e) => {
    const n = ["Digit1", "Digit2", "Digit3"].indexOf(e.code);
    const k = n < 0 ? ["Numpad1", "Numpad2", "Numpad3"].indexOf(e.code) : n;
    if (k < 0 || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]"))
      return;
    etage(k);
  });
}
majDocs();
setInterval(majDocs, 10e3);

// Réglages d'affichage gardés dans le navigateur ; « Masquer » cache tout le tableau de bord.
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
    b.checked = !off;
  }
  const masque = !!reglages["sans-panneaux"];
  document.body.classList.toggle("sans-panneaux", masque);
  $("masquer").setAttribute("aria-pressed", String(masque));
  $("masquer").textContent = masque
    ? "Afficher le tableau de bord"
    : "Masquer le tableau de bord";
}
const garder = () => {
  memoire.ecrire(reglages);
  appliquer();
};
document.addEventListener("change", (e) => {
  const b = e.target.closest("[data-bascule]");
  if (!b) return;
  reglages[b.dataset.bascule] = !b.checked;
  garder();
});
$("masquer").addEventListener("click", () => {
  reglages["sans-panneaux"] = !reglages["sans-panneaux"];
  garder();
});
appliquer();

org = await (await fetch("/organigramme")).json();
en3D((s) => s.construire(org));
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
