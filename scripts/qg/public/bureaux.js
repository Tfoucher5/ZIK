// Les bureaux : un poste par agent, le personnage bouge et parle quand il travaille, dort sinon.
const POSTES = [
  ["Claude", "🧑‍💻"],
  ["reviewer", "🔍"],
  ["test-writer", "🧪"],
  ["dev", "🛠️"],
  ["recette", "📱"],
  ["incident", "🚨"],
  ["produit", "🎨"],
  ["marketing", "📣"],
  ["chiffres", "📊"],
];
const icones = new Map(POSTES);
const zone = document.getElementById("bureaux");

function poste(nom, icone) {
  const div = document.createElement("div");
  div.className = "poste";
  div.innerHTML = `<p class="bulle"></p><span class="perso"></span><span class="table"></span><b></b>`;
  div.querySelector(".perso").textContent = icone;
  div.querySelector("b").textContent = nom;
  zone.append(div);
  return div;
}
const postes = new Map(POSTES.map(([nom, icone]) => [nom, poste(nom, icone)]));

export function majBureaux(etat) {
  const travail = new Map();
  const ajoute = (nom, texte) => {
    const [n, t] = travail.get(nom) ?? [0, texte];
    travail.set(nom, [n + 1, t || "au travail"]);
  };
  for (const s of etat.sessions.filter((s) => s.actif))
    ajoute("Claude", s.activite);
  for (const a of etat.agents.filter((a) => a.actif))
    ajoute(a.type, a.activite || a.description);
  for (const l of etat.enAttente) ajoute(l.type, "arrive…");

  // Un agent hors liste (Explore, general-purpose…) a un poste le temps de sa mission.
  for (const nom of travail.keys())
    if (!postes.has(nom)) postes.set(nom, poste(nom, icones.get(nom) ?? "🤖"));
  for (const [nom, div] of postes) {
    const actif = travail.get(nom);
    if (!actif && !icones.has(nom)) {
      div.remove();
      postes.delete(nom);
      continue;
    }
    div.classList.toggle("actif", !!actif);
    div.querySelector(".bulle").textContent = actif
      ? `${actif[0] > 1 ? `×${actif[0]} · ` : ""}${actif[1]}`
      : "zzz";
  }
}
