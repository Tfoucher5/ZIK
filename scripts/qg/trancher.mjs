// Décisions qui attendent Théo, lues dans docs/strategie/a-trancher.md.
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
    if (champ && decisions.length) {
      const cle = champ[1]
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase();
      decisions.at(-1)[cle] = champ[2].replaceAll("`", "").trim();
    }
  }
  return decisions;
}
