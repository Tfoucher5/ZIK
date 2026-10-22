import { describe, it, expect } from "vitest";
import {
  filterRooms,
  countByFilter,
  sortRooms,
  toggleFilter,
} from "../rooms/filter.js";

const NOW = Date.parse("2026-10-11T12:00:00Z");
const rooms = [
  {
    name: "Rap FR",
    game_mode: "classic",
    online: 0,
    track_count: 300,
    last_active_at: "2026-10-11T11:30:00Z",
    playlists: [{ name: "PNL" }],
    profiles: { username: "tesko" },
  },
  {
    name: "Disney",
    game_mode: "qcm",
    online: 3,
    track_count: 100,
    last_active_at: "2026-10-10T12:00:00Z",
    is_official: true,
    cards: true,
  },
  {
    name: "Années 80",
    game_mode: "classic",
    online: 0,
    track_count: 500,
    last_active_at: "2026-10-09T12:00:00Z",
    auto_start: true,
  },
];

describe("filterRooms", () => {
  it("cherche dans le nom, le créateur et les playlists", () => {
    expect(filterRooms(rooms, { q: "pnl" }).map((r) => r.name)).toEqual([
      "Rap FR",
    ]);
    expect(filterRooms(rooms, { q: "TESKO" })).toHaveLength(1);
  });

  it("cumule les filtres", () => {
    expect(
      filterRooms(rooms, { active: ["classic", "auto"] }, NOW).map(
        (r) => r.name,
      ),
    ).toEqual(["Années 80"]);
  });

  it("actives depuis moins d'une heure", () => {
    expect(
      filterRooms(rooms, { active: ["recent"] }, NOW).map((r) => r.name),
    ).toEqual(["Rap FR"]);
  });
});

describe("countByFilter", () => {
  it("compte par filtre en tenant compte de la recherche", () => {
    const c = countByFilter(rooms, "", NOW);
    expect(c.classic).toBe(2);
    expect(c.live).toBe(1);
    expect(countByFilter(rooms, "disney", NOW).classic).toBe(0);
  });
});

describe("sortRooms", () => {
  it("garde les parties en cours en tête", () => {
    expect(sortRooms(rooms, "tracks").map((r) => r.name)).toEqual([
      "Disney",
      "Années 80",
      "Rap FR",
    ]);
    expect(sortRooms(rooms, "name")[0].name).toBe("Disney");
  });
});

describe("toggleFilter", () => {
  it("Classique et QCM s'excluent", () => {
    expect(toggleFilter(["classic", "cards"], "qcm")).toEqual(["cards", "qcm"]);
    expect(toggleFilter(["qcm"], "qcm")).toEqual([]);
  });
});
