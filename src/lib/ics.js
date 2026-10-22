// Fichier agenda (.ics) d'une soirée, lu par Google Agenda, Apple et Outlook
const SITE = "https://www.zik-music.fr";
const DURATION_MS = 3 * 3600_000;

const stamp = (d) =>
  new Date(d)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const esc = (s) =>
  String(s)
    .replace(/[\\;,]/g, (c) => `\\${c}`)
    .replace(/\n/g, "\\n");

export function eventIcs(venue, event, now = new Date()) {
  const url = `${SITE}/lieu/${venue.slug}`;
  const title = `Blind test${event.theme ? ` ${event.theme}` : ""} - ${venue.name}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZIK//Soirees blind test//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@zik-music.fr`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(event.starts_at)}`,
    `DTEND:${stamp(Date.parse(event.starts_at) + DURATION_MS)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc([venue.address, venue.city].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc(`On joue sur son téléphone, sans appli. Dates et classement du mois : ${url}`)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
