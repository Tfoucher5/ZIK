// Fichiers « une section par sujet » de docs/strategie : a-trancher.md (décisions qui attendent Théo) et chantiers.md.
const sansAccent = (s) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function lireATrancher(md) {
  const decisions = [];
  let code = false;
  for (const ligne of md.split(/\r?\n/)) {
    if (ligne.startsWith("```")) code = !code;
    if (code) continue;
    const titre = ligne.match(/^## +(.+)/);
    if (titre) {
      decisions.push({ titre: titre[1].replaceAll("`", "").trim() });
      continue;
    }
    const champ = ligne.match(/^- \*\*(.+?)\*\* *: *(.+)/);
    if (champ && decisions.length)
      decisions.at(-1)[sansAccent(champ[1])] = champ[2]
        .replaceAll("`", "")
        .trim();
  }
  return decisions;
}

const ETATS = ["en cours", "a faire", "fait"];

// etat : « en-cours », « a-faire » ou « fait » ; un statut inconnu compte comme « à faire ».
export function lireChantiers(md) {
  return lireATrancher(md).map((c) => {
    const s = sansAccent(c.statut ?? "");
    const etat = ETATS.find((e) => s.startsWith(e)) ?? "a faire";
    return { ...c, etat: etat.replace(" ", "-") };
  });
}
