import { delaiDe, nextAttempt } from "./relance.js";

// Survit au remontage (même page) ; le stockage de session survit au rechargement
const memoire = {};

// Compte l'essai et l'écrit tout de suite. Un stockage qui lit sans écrire
// vaut un stockage indisponible : sinon le compteur ne monte jamais et
// l'écran se relance en boucle toutes les 3 s.
export function compterEssai(d, cle, now) {
  const mem = memoire[cle] ?? null;
  try {
    const saved = JSON.parse(d.storage.getItem(cle) ?? "null") ?? mem;
    const n = nextAttempt(saved, now);
    d.storage.setItem(cle, JSON.stringify({ essai: n.essai, at: now }));
    memoire[cle] = { essai: n.essai, at: now };
    return { ...n, precedente: saved?.at ?? -Infinity };
  } catch {
    const essai = Math.max(3, nextAttempt(mem, now).essai);
    memoire[cle] = { essai, at: now };
    return { essai, delai: delaiDe(essai), precedente: mem?.at ?? -Infinity };
  }
}

export function noterRelance(d, cle, v) {
  memoire[cle] = v;
  try {
    d.storage.setItem(cle, JSON.stringify(v));
  } catch {
    /* mémoire seule */
  }
}
