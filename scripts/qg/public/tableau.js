// Tableau de bord autour des bureaux : limite d'utilisation, qui fait quoi, chantiers, flux en direct.
import { EQUIPE, fiche } from "./noms.js";

const $ = (id) => document.getElementById(id);
const el = (tag, texte, classe) => {
  const n = document.createElement(tag);
  if (texte != null) n.textContent = texte;
  if (classe) n.className = classe;
  return n;
};
export const heure = (t) =>
  new Date(t).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
const jourHeure = (t) => {
  const d = new Date(t);
  return d.toDateString() === new Date().toDateString()
    ? heure(t)
    : `${d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" })} à ${heure(t)}`;
};
const duree = (ms) => {
  const min = Math.max(1, Math.round(ms / 60e3));
  return min < 60
    ? `${min} min`
    : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
};
const lire = async (url) => {
  try {
    return await (await fetch(url)).json();
  } catch {
    return null;
  }
};

let org = { chefs: [] };
let annuaire = new Map();
let limites = null;

// Prénom d'un auteur du flux : « /tech » = la session principale sous un skill (son chef, sinon Claire, la CEO).
function personne(id) {
  if (id?.startsWith("/")) {
    const skill = id.slice(1);
    id = org.chefs.some((c) => c.id === skill) ? skill : "ceo";
  }
  return annuaire.get(id) ?? EQUIPE[id] ?? fiche(id ?? "?", id);
}

function jauge(nom, fenetre, maintenant) {
  const fini = !fenetre.resets_at || fenetre.resets_at * 1000 <= maintenant;
  const pct = fini ? 0 : Math.min(100, Math.round(fenetre.used_percentage));
  const div = el("div", null, "jauge");
  div.dataset.niveau = pct >= 90 ? "rouge" : pct >= 70 ? "orange" : "ok";
  const tete = el("div", null, "tete");
  tete.append(el("span", nom), el("strong", `${pct} %`));
  const piste = el("div", null, "piste");
  const remplie = el("i");
  remplie.style.width = `${pct}%`;
  piste.append(remplie);
  div.append(
    tete,
    piste,
    el(
      "small",
      fini
        ? "Remise à zéro faite"
        : `Remise à zéro ${jourHeure(fenetre.resets_at * 1000)}`,
    ),
  );
  return div;
}

function majLimite(etat) {
  const zone = $("limite");
  const m = etat.maintenant;
  if (limites?.five_hour || limites?.seven_day) {
    zone.replaceChildren(
      ...(limites.five_hour ? [jauge("5 heures", limites.five_hour, m)] : []),
      ...(limites.seven_day ? [jauge("Semaine", limites.seven_day, m)] : []),
      el("p", `Relevé à ${heure(limites.maj)}`, "note"),
    );
    return;
  }
  const l = etat.limite;
  const lignes = [];
  if (l.atteinte)
    lignes.push(
      el(
        "p",
        `Limite ${l.atteinte === "cinq" ? "des 5 h" : "de la semaine"} atteinte · reprise à ${jourHeure(l.fin)}`,
        "alerte",
      ),
    );
  else if (l.debut)
    lignes.push(
      el(
        "p",
        `Fenêtre de 5 h ouverte à ${heure(l.debut)} · remise à zéro vers ${heure(l.fin)}`,
      ),
    );
  else lignes.push(el("p", "Aucune fenêtre de 5 h ouverte."));
  lignes.push(
    el(
      "p",
      "Estimation d'après les journaux. Le pourcentage exact arrive avec la barre d'état (README).",
      "note",
    ),
  );
  zone.replaceChildren(...lignes);
}

function majEquipe(etat) {
  const m = etat.maintenant;
  const lignes = [
    ...etat.sessions
      .filter((s) => s.actif)
      .map((s) => ({
        p: personne(s.skill ? `/${s.skill.split(":").pop()}` : "ceo"),
        tache: `${s.projet} · ${s.branche}`,
        detail: s.activite,
        t: null,
      })),
    ...etat.agents
      .filter((a) => a.actif)
      .map((a) => ({
        p: personne(a.type),
        tache: a.description,
        detail: a.activite,
        t: a.debut,
      })),
    ...etat.enAttente.map((l) => ({
      p: personne(l.type),
      tache: l.description,
      detail: "Arrive…",
      t: l.t,
    })),
  ];
  $("equipe").replaceChildren(
    ...(lignes.length
      ? lignes.map(({ p, tache, detail, t }) => {
          const li = el("li");
          const tete = el("div", null, "tete");
          const qui = el("b", p.nom);
          if (p.role) qui.append(el("span", ` · ${p.role}`));
          tete.append(qui);
          if (t) tete.append(el("time", duree(m - t)));
          li.append(tete, el("p", tache || "—"));
          if (detail) li.append(el("small", detail));
          return li;
        })
      : [el("li", "Personne au travail.", "vide")]),
  );
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
        const groupe = el(cle === "fait" ? "details" : "div", null, "groupe");
        const items = liste.filter((c) => c.etat === cle);
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

function majFlux(etat) {
  $("flux").replaceChildren(
    ...etat.flux.map((e) => {
      const li = el("li");
      const quoi = e.cible
        ? `Lance ${personne(e.cible).nom} : ${e.quoi}`
        : e.quoi;
      li.append(
        el("time", heure(e.t)),
        el("b", personne(e.qui).nom),
        el("span", quoi),
      );
      return li;
    }),
  );
}

let dernier = null;
export function majTableau(etat, organigramme) {
  org = organigramme;
  dernier = etat;
  majLimite(etat);
  majEquipe(etat);
  majFlux(etat);
}

async function majAnnuaire() {
  const agents = await lire("/agents");
  if (agents) annuaire = new Map(agents.map((a) => [a.id, a]));
}
async function majLimites() {
  limites = await lire("/limites");
  if (dernier) majLimite(dernier);
}

majAnnuaire();
majLimites();
majChantiers();
setInterval(majAnnuaire, 60e3);
setInterval(majLimites, 15e3);
setInterval(majChantiers, 10e3);
