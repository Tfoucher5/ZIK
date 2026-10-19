import { fuzzyFilter } from "../fuzzy.js";

const HOUR = 3_600_000;

// Filtres de la page Rooms : clé → test sur une room.
export const FILTERS = {
  live: { label: "● En jeu", test: (r) => r.online > 0 },
  recent: {
    label: "Actives (1 h)",
    test: (r, now) =>
      !!r.last_active_at && now - new Date(r.last_active_at).getTime() < HOUR,
  },
  classic: { label: "Classique", test: (r) => r.game_mode !== "qcm" },
  qcm: { label: "QCM", test: (r) => r.game_mode === "qcm" },
  official: { label: "Officielles", test: (r) => r.is_official },
  cards: { label: "Cartes", test: (r) => r.cards },
  auto: { label: "Démarrage auto", test: (r) => r.auto_start },
};

// Classique et QCM s'excluent : en activer un coupe l'autre.
export function toggleFilter(active, key) {
  const next = new Set(active);
  if (next.has(key)) next.delete(key);
  else {
    next.add(key);
    if (key === "qcm") next.delete("classic");
    if (key === "classic") next.delete("qcm");
  }
  return [...next];
}

const ROOM_SEARCH_KEYS = [
  "name",
  (r) => r.profiles?.username,
  (r) => (r.playlists || []).map((p) => p?.name).join(" "),
];

export function filterRooms(rooms, { q = "", active = [] }, now = Date.now()) {
  return fuzzyFilter(rooms, q, ROOM_SEARCH_KEYS).filter((r) =>
    active.every((k) => FILTERS[k].test(r, now)),
  );
}

// Nombre de rooms par filtre, recherche comprise, pour l'afficher sur la puce.
export function countByFilter(rooms, q, now = Date.now()) {
  const base = filterRooms(rooms, { q }, now);
  return Object.fromEntries(
    Object.entries(FILTERS).map(([k, f]) => [
      k,
      base.filter((r) => f.test(r, now)).length,
    ]),
  );
}

export const SORTS = {
  activity: "Activité",
  tracks: "Nombre de titres",
  name: "A-Z",
};

const time = (r) =>
  r.last_active_at ? new Date(r.last_active_at).getTime() : 0;

// Les parties en cours restent toujours en tête.
export function sortRooms(rooms, sort) {
  const by = {
    activity: (a, b) => time(b) - time(a),
    tracks: (a, b) => (b.track_count || 0) - (a.track_count || 0),
    name: (a, b) => a.name.localeCompare(b.name, "fr"),
  }[sort];
  return [...rooms].sort((a, b) => (b.online > 0) - (a.online > 0) || by(a, b));
}
