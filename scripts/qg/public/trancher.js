// « À trancher » : bouton avec badge, fenêtre plein écran pour répondre aux décisions, brouillons dans le navigateur.
import { lienOuvrable } from "./liens.js";

const $ = (id) => document.getElementById(id);
const fenetre = $("trancher");
const bouton = $("ouvrir-trancher");
const CHAMPS = [
  ["question", "Question"],
  ["recommandation", "Recommandation"],
];
const CLE = "qg-brouillons";
let decisions = [];
let dernier = "";

const el = (tag, texte, classe) => {
  const n = document.createElement(tag);
  if (texte) n.textContent = texte;
  if (classe) n.className = classe;
  return n;
};
const brouillons = () => {
  try {
    return JSON.parse(localStorage.getItem(CLE)) ?? {};
  } catch {
    return {};
  }
};
const garder = (titre, texte) => {
  const b = brouillons();
  if (texte.trim()) b[titre] = texte;
  else delete b[titre];
  try {
    localStorage.setItem(CLE, JSON.stringify(b));
  } catch {
    /* navigation privée */
  }
};
const heure = (iso) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const options = (texte = "") => {
  let parts = texte.split(/\s*;\s*/).filter(Boolean);
  if (parts.length < 2) parts = texte.split(/\s+\/\s+/).filter(Boolean);
  return parts.map((o) => o.replace(/^ou\s+/i, ""));
};

function carte(d) {
  const art = el("article", null, "decision");
  art.dataset.titre = d.titre;
  const tete = el("header");
  tete.append(el("h3", d.titre));
  if (d.statut) tete.append(el("span", d.statut, "statut"));
  if (d.envoye)
    tete.append(
      el(
        "span",
        `Envoyé le ${heure(d.envoye)}, en attente de Claude`,
        "envoye",
      ),
    );
  const infos = [d.chantier, d.depuis && `depuis le ${d.depuis}`]
    .filter(Boolean)
    .join(" · ");
  if (infos) tete.append(el("small", infos));
  const dl = el("dl");
  for (const [cle, nom] of CHAMPS)
    if (d[cle]) dl.append(el("dt", nom), el("dd", d[cle]));
  if (d.lien) {
    const dd = el("dd");
    const href = lienOuvrable(d.lien);
    if (href) {
      const a = el("a", d.lien);
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      dd.append(a);
    } else dd.textContent = d.lien;
    dl.append(el("dt", "Lien"), dd);
  }
  if (d.envoye) dl.append(el("dt", "Ta réponse"), el("dd", d.reponse));
  const zone = el("textarea");
  zone.rows = 3;
  zone.placeholder = d.envoye ? "Compléter ma réponse…" : "Ma réponse…";
  zone.setAttribute("aria-label", `Réponse : ${d.titre}`);
  zone.value = brouillons()[d.titre] ?? "";
  zone.addEventListener("input", () => garder(d.titre, zone.value));
  const choix = options(d.options);
  const rapides = el("div", null, "options");
  for (const o of choix) {
    const b = el("button", o, "option");
    b.type = "button";
    b.addEventListener("click", () => {
      const reste = zone.value.trim();
      zone.value = reste && !choix.includes(reste) ? `${o}. ${reste}` : o;
      garder(d.titre, zone.value);
      zone.focus();
    });
    rapides.append(b);
  }
  art.append(tete, dl);
  if (choix.length) art.append(rapides);
  art.append(zone);
  return art;
}

function badge() {
  const enAttente = decisions.filter((d) => !d.envoye).length;
  bouton.querySelector(".badge").textContent = enAttente;
  bouton.classList.toggle("vide", !enAttente);
}

function afficher() {
  badge();
  fenetre
    .querySelector(".liste")
    .replaceChildren(
      ...(decisions.length
        ? decisions.map(carte)
        : [el("p", "Rien à trancher.", "vide")]),
    );
}

const reponses = () => {
  const b = brouillons();
  return decisions
    .filter((d) => b[d.titre]?.trim())
    .map((d) => ({ titre: d.titre, reponse: b[d.titre].trim() }));
};
const dire = (texte) => ($("trancher-etat").textContent = texte);

async function maj() {
  let texte;
  try {
    texte = await (await fetch("/a-trancher")).text();
  } catch {
    return;
  }
  if (texte === dernier) return;
  dernier = texte;
  decisions = JSON.parse(texte);
  // Pas de nouveau rendu pendant la frappe : on garderait le texte mais perdrait le curseur.
  if (!fenetre.open || !fenetre.contains(document.activeElement)) afficher();
  else badge();
}

bouton.addEventListener("click", () => {
  afficher();
  dire("");
  fenetre.showModal();
});
$("fermer").addEventListener("click", () => fenetre.close());
$("copier").addEventListener("click", async () => {
  const r = reponses();
  if (!r.length) return dire("Aucune réponse écrite.");
  const texte = [
    "Mes réponses aux décisions du QG :",
    "",
    ...r.map((x) => `- ${x.titre} → ${x.reponse}`),
  ].join("\n");
  try {
    await navigator.clipboard.writeText(texte);
    dire(`${r.length} réponse(s) copiée(s), à coller dans le terminal.`);
  } catch {
    dire("Copie refusée par le navigateur.");
  }
});
$("envoyer").addEventListener("click", async () => {
  const r = reponses();
  if (!r.length) return dire("Aucune réponse écrite.");
  try {
    const res = await fetch("/reponses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reponses: r }),
    });
    if (!res.ok) throw new Error(res.status);
  } catch {
    return dire("Envoi impossible : le serveur du QG répond-il ? Réessaie.");
  }
  for (const x of r) garder(x.titre, "");
  dernier = "";
  await maj();
  afficher();
  dire(
    `${r.length} réponse(s) envoyée(s). Claude les lit dans la boîte du QG.`,
  );
});

maj();
setInterval(maj, 5000);
