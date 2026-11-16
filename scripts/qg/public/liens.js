// Lien d'une décision : http tel quel, chemin local (C:\…, /…, docs/…) servi par /voir (dossiers autorisés seulement).
export const lienOuvrable = (lien) => {
  if (/^https?:\/\//.test(lien)) return lien;
  if (/^([a-z]:)?[\\/]|^[\w.-]+[\\/]\S/i.test(lien))
    return `/voir?f=${encodeURIComponent(lien)}`;
  return null;
};
