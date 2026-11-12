import { ago } from "../../../shared/admin/stats-utils.js";

// Rendu aussi sur le serveur (UTC) : l'heure de Paris partout
export const clock = (ms) =>
  new Date(ms).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

/** « depuis 3 min », ou « à l'instant ». */
export function since(ms) {
  const a = ago(new Date(ms).toISOString());
  return a.startsWith("il y a ") ? `depuis ${a.slice(7)}` : a;
}
