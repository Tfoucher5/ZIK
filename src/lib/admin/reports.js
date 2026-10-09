import { BUG_MOTIFS } from "$lib/reports/bug-report.js";

export const REPORT_TYPES = {
  bug: "Bug",
  contact: "Contact",
  user: "Joueur signalé",
};

const MOTIFS = Object.fromEntries(BUG_MOTIFS.map((m) => [m.value, m.label]));

export const TRACK_SUBJECTS = ["audio", "mauvaise-reponse"];

export function subjectLabel(r) {
  if (r.type === "bug" && r.subject)
    return MOTIFS[r.subject] ?? `Bug : ${r.subject}`;
  if (r.type === "user" && r.subject) return `Joueur signalé : ${r.subject}`;
  return r.subject || REPORT_TYPES[r.type] || r.type;
}
