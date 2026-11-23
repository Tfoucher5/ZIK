import { delaiDe, nextAttempt } from "./relance.js";

// Survit au remontage (même page) ; le stockage de session survit au rechargement
const memoire = {};

// Horloge qui recule : la dernière relance n'est jamais dans le futur
const avant = (v, now) =>
  Number.isFinite(v?.at) ? Math.min(v.at, now) : -Infinity;

// Compte l'essai, l'écrit et le relit tout de suite. Un stockage qui lit sans
// écrire vaut un stockage indisponible : sinon le compteur ne monte jamais et
// l'écran se relance en boucle toutes les 3 s.
export function compterEssai(d, cle, now) {
  const mem = memoire[cle] ?? null;
  try {
    const saved = JSON.parse(d.storage.getItem(cle) ?? "null") ?? mem;
    const n = nextAttempt(saved, now);
    const v = JSON.stringify({ essai: n.essai, at: now });
    d.storage.setItem(cle, v);
    if (d.storage.getItem(cle) !== v) throw new Error("stockage muet");
    memoire[cle] = { essai: n.essai, at: now };
    return { ...n, precedente: avant(saved, now) };
  } catch {
    const essai = Math.max(3, nextAttempt(mem, now).essai);
    memoire[cle] = { essai, at: now };
    return { essai, delai: delaiDe(essai), precedente: avant(mem, now) };
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
