// Formats et listes de la fiche joueur de l'admin.

export const BANS = [
  ["24h", "24 heures"],
  ["168h", "7 jours"],
  ["720h", "30 jours"],
  ["8760h", "1 an"],
  ["87600h", "Définitif (10 ans)"],
];

export const date = (iso, withTime = false) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "—";
