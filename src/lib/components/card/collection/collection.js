import { RARITY_ORDER } from "../rarity.js";
import { fuzzyFilter } from "../../../fuzzy.js";

export const STEP = 60;
export const VIEWS = [
  ["toutes", "Toutes"],
  ["artistes", "Artistes"],
  ["albums", "Albums"],
];
// Vues Artistes et Albums : tri et état des sets
export const GROUP_SORTS = [
  ["progression", "Progression"],
  ["presque", "Presque terminés"],
  ["cartes", "Plus de cartes"],
  ["nom", "De A à Z"],
];
export const STATES = [
  ["", "Tous les sets"],
  ["termines", "Terminés"],
  ["a-completer", "À compléter"],
];
export const SORTS = [
  ["recentes", "Plus récentes"],
  ["rarete", "Rareté"],
  ["artiste", "Artiste"],
  ["titre", "Titre"],
];

export const decadeOf = (year) => (year ? `${Math.floor(year / 10) * 10}` : "");
export const decadeLabel = (d) =>
  Number(d) >= 2000 ? `Années ${d}` : `Années ${String(d).slice(2)}`;
export const fmt = (n) => n.toLocaleString("fr-FR");
// Au moins un trait visible dès la première carte
export const pct = (n, total) =>
  total ? `${n ? Math.max(1.5, (n / total) * 100) : 0}%` : "0%";

export const pendingLabel = (c) => {
  const h = Math.max(
    1,
    Math.ceil((new Date(c.visibleAt).getTime() - Date.now()) / 36e5),
  );
  return `Disponible dans ${h} h`;
};

// Photo d'artiste servie par Deezer à partir de son id (rien à stocker) ;
// la pochette reprend la place si elle ne charge pas
export const artistPhoto = (id) =>
  `https://api.deezer.com/artist/${id}/image?size=big`;
export function photoFallback(e, cover) {
  e.currentTarget.onerror = null;
  e.currentTarget.src = cover;
  e.currentTarget.classList.remove("is-artist");
}

// Chargement au fil du défilement : le bouton « Afficher plus » se déclenche
// seul quand il approche de l'écran (il reste utilisable au clavier)
export function autoMore(node) {
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      node.click();
      // Toujours visible après l'ajout (grand écran) : on revérifie
      io.unobserve(node);
      requestAnimationFrame(() => io.observe(node));
    },
    { rootMargin: "600px 0px" },
  );
  io.observe(node);
  return { destroy: () => io.disconnect() };
}

export function filterCards(cards, { q, rarity, genre, decade, sort }) {
  const list = fuzzyFilter(cards, q, ["title", "artist", "album"]).filter(
    (c) =>
      (!rarity || c.rarity === rarity) &&
      (!genre || c.genre === genre) &&
      (!decade || decadeOf(c.year) === decade),
  );
  const rank = (c) => RARITY_ORDER.indexOf(c.rarity);
  const by = {
    recentes: (a, b) =>
      String(b.obtainedAt).localeCompare(String(a.obtainedAt)),
    rarete: (a, b) => rank(b) - rank(a) || b.rank - a.rank,
    artiste: (a, b) =>
      a.artist.localeCompare(b.artist, "fr") ||
      a.title.localeCompare(b.title, "fr"),
    titre: (a, b) => a.title.localeCompare(b.title, "fr"),
  }[sort];
  return [...list].sort(by);
}

// Groupes artiste / album : progression du set quand il existe (3 cartes
// et plus dans ZIK), sinon simple compte des cartes possédées
export function groupCards(cards, allSets, { view, groupSort, setState }) {
  const kind = view === "artistes" ? "artist" : "album";
  const keyOf = (c) => String(kind === "artist" ? c.artistId : c.albumId);
  const sets = new Map(
    allSets.filter((s) => s.kind === kind).map((s) => [s.key, s]),
  );
  const byKey = {};
  for (const c of cards) {
    const key = keyOf(c);
    if (!key || key === "null") continue;
    byKey[key] ??= {
      key,
      set: sets.get(key),
      name: sets.get(key)?.name ?? (kind === "artist" ? c.artist : c.album),
      cover: sets.get(key)?.cover ?? c.coverMd,
      photo: kind === "artist" ? artistPhoto(key) : null,
      cards: [],
    };
    byKey[key].cards.push(c);
  }
  // Progression d'un groupe : 0 à 1 pour un set, -1 sans set (moins de
  // 3 cartes dans ZIK) pour finir en bas de liste
  const ratio = (g) => (g.set ? g.set.owned / g.set.total : -1);
  const left = (g) =>
    g.set && !g.set.completedAt ? g.set.total - g.set.owned : Infinity;
  const byName = (a, b) => a.name.localeCompare(b.name, "fr");
  const by =
    {
      progression: (a, b) =>
        Number(!!b.set?.completedAt) - Number(!!a.set?.completedAt) ||
        ratio(b) - ratio(a) ||
        byName(a, b),
      presque: (a, b) =>
        left(a) - left(b) || ratio(b) - ratio(a) || byName(a, b),
      cartes: (a, b) => b.cards.length - a.cards.length || byName(a, b),
      nom: byName,
    }[groupSort] ?? byName;
  return Object.values(byKey)
    .filter(
      (g) =>
        !setState ||
        (setState === "termines"
          ? !!g.set?.completedAt
          : !!g.set && !g.set.completedAt),
    )
    .sort(by);
}
