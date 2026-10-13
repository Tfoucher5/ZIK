// Lieux ZIK Pro : règles partagées entre le formulaire et le serveur.

export const VENUE_FIELDS = {
  name: { label: "Nom du lieu", max: 60, required: true },
  city: { label: "Ville", max: 40, required: true },
  address: { label: "Adresse", max: 120 },
  website: { label: "Site ou page Facebook", max: 200 },
  schedule: { label: "Rendez-vous", max: 80 },
  welcome: { label: "Message d'accueil sur la TV", max: 80 },
  description: { label: "Présentation", max: 600 },
};

export const LOGO_MAX_CHARS = 120_000;
const LOGO_RE = /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/;
const COLOR_RE = /^#[0-9a-f]{6}$/i;

// Champs propres, ou message d'erreur à montrer tel quel
export function cleanVenue(input) {
  const out = {};
  for (const [key, f] of Object.entries(VENUE_FIELDS)) {
    const v = String(input[key] ?? "").trim();
    if (f.required && !v) return { error: `${f.label} : à remplir.` };
    if (v.length > f.max)
      return { error: `${f.label} : ${f.max} caractères maximum.` };
    out[key] = v || null;
  }
  if (out.website && !/^https?:\/\//i.test(out.website))
    out.website = `https://${out.website}`;
  out.color = COLOR_RE.test(input.color ?? "") ? input.color : null;
  const logo = input.logo ?? null;
  if (logo && (logo.length > LOGO_MAX_CHARS || !LOGO_RE.test(logo)))
    return { error: "Logo : image trop lourde ou format non pris en charge." };
  out.logo = logo;
  return { venue: out };
}

// Saison = le mois en cours, heure de Paris
export function seasonStart(now = new Date()) {
  const [y, m] = now
    .toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })
    .split("-");
  return new Date(`${y}-${m}-01T00:00:00+01:00`);
}

export function seasonLabel(now = new Date()) {
  return now.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

// Texte lisible sur la couleur du lieu
export function onColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#000000" : "#ffffff";
}
