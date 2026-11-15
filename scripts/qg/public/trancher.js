// Panneau « À trancher » : décisions qui attendent Théo, relues toutes les 5 s.
const panneau = document.getElementById("trancher");
const CHAMPS = [
  ["question", "Question"],
  ["options", "Options"],
  ["recommandation", "Recommandation"],
];
let dernier = "";

const el = (tag, texte, classe) => {
  const n = document.createElement(tag);
  if (texte) n.textContent = texte;
  if (classe) n.className = classe;
  return n;
};

function decision(d, ouvertes) {
  const det = el("details");
  det.open = ouvertes.has(d.titre);
  const resume = el("summary");
  resume.append(el("b", d.titre));
  if (d.statut) resume.append(el("span", d.statut, "statut"));
  resume.append(
    el(
      "small",
      [d.chantier, d.depuis && `depuis le ${d.depuis}`]
        .filter(Boolean)
        .join(" · "),
    ),
  );
  const dl = el("dl");
  for (const [cle, nom] of CHAMPS)
    if (d[cle]) dl.append(el("dt", nom), el("dd", d[cle]));
  if (d.lien) {
    const dd = el("dd");
    if (/^https?:\/\//.test(d.lien)) {
      const a = el("a", d.lien);
      a.href = d.lien;
      a.target = "_blank";
      a.rel = "noopener";
      dd.append(a);
    } else dd.textContent = d.lien;
    dl.append(el("dt", "Lien"), dd);
  }
  det.append(resume, dl);
  return det;
}

async function maj() {
  let texte;
  try {
    texte = await (await fetch("/a-trancher")).text();
  } catch {
    return;
  }
  if (texte === dernier) return;
  dernier = texte;
  const liste = JSON.parse(texte);
  const ouvertes = new Set(
    [...panneau.querySelectorAll(".liste > details[open] > summary > b")].map(
      (b) => b.textContent,
    ),
  );
  panneau.querySelector(".badge").textContent = liste.length;
  panneau.classList.toggle("vide", !liste.length);
  panneau
    .querySelector(".liste")
    .replaceChildren(
      ...(liste.length
        ? liste.map((d) => decision(d, ouvertes))
        : [el("p", "Rien à trancher.")]),
    );
}

maj();
setInterval(maj, 5000);
