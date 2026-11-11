import { describe, it, expect, beforeEach, vi } from "vitest";

// Pas de base en test : les instantanés sont couverts par snapshot.test.js
vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  freezeAndSaveAll: async () => {},
  purgeSnapshots: async () => {},
  dropSnapshot: async () => {},
  restoreSalon: async () => {},
}));

vi.mock("../persist.js", () => ({ recordSalonGameEnd: () => {} }));
vi.mock("../session.js", () => ({
  prepareSession: () => {},
  prefetchNextVideo: () => {},
  drawSpareTrack: () => {},
}));

const { salonRooms } = await import("../../../state.js");
const { registerBuzzer } = await import("../buzzer.js");
const { registerEvening } = await import("../evening.js");
const { addPlayer, broadcastRoster } = await import("../players.js");
const { drawSpecial, roundMult } = await import("../specials.js");

const CODE = "BUZZ01";
const sent = [];
const io = {
  to: () => ({ emit: (ev, d) => sent.push([ev, d]) }),
  sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
};

// Faux socket : garde les gestionnaires pour les appeler à la main
function sock(props) {
  const h = {};
  const s = { ...props, on: (ev, fn) => (h[ev] = fn), emit: () => {} };
  registerBuzzer(s, io);
  registerEvening(s, io);
  return (ev, data) => h[ev](data);
}

function salonDeTest() {
  salonRooms[CODE] = {
    code: CODE,
    pro: true,
    settings: {
      answerMode: "buzzer",
      roundDuration: 30,
      manualNext: true,
      teams: null,
    },
    players: {},
    game: {
      phase: "round",
      timerActive: true,
      startTime: Date.now() - 5000,
      currentTrack: { title: "T", artist: "A", mainArtist: "A" },
      history: [],
    },
  };
  const salon = salonRooms[CODE];
  for (const u of ["Ana", "Bob"]) addPlayer(salon, u, `s-${u}`);
  return salon;
}

// Seul téléphone branché dans la salle des joueurs : reçoit sa propre vue
function telephone(code, u) {
  const recus = [];
  io.sockets.adapter.rooms.clear();
  io.sockets.sockets.clear();
  io.sockets.adapter.rooms.set(`salon:players:${code}`, new Set([`s-${u}`]));
  io.sockets.sockets.set(`s-${u}`, {
    salonUsername: u,
    emit: (ev, d) => recus.push([ev, d]),
  });
  return recus;
}

const joueur = (u) => sock({ salonCode: CODE, salonUsername: u });
const regie = () => sock({ salonCode: CODE, salonAdmin: true });

describe("mode buzzer", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    sent.length = 0;
  });

  it("le premier buzz met en pause, le second est ignoré", () => {
    const salon = salonDeTest();
    joueur("Ana")("salon_buzz");
    joueur("Bob")("salon_buzz");
    expect(salon.game.buzzer.username).toBe("Ana");
    expect(salon.game.paused).toBe(true);
    expect(sent.filter(([ev]) => ev === "salon_buzzed")).toHaveLength(1);
  });

  it("mauvaise réponse : le joueur est bloqué et la musique repart", () => {
    const salon = salonDeTest();
    joueur("Ana")("salon_buzz");
    regie()("salon_buzz_judge", { correct: false });
    expect(salon.players.Ana._buzzLocked).toBe(true);
    expect(salon.game.paused).toBe(false);
    expect(salon.game.phase).toBe("round");
    joueur("Ana")("salon_buzz");
    expect(salon.game.buzzer).toBeNull();
  });

  it("bonne réponse : points selon la rapidité, fin de manche", () => {
    const salon = salonDeTest();
    joueur("Bob")("salon_buzz");
    regie()("salon_buzz_judge", { correct: true });
    expect(salon.players.Bob.score).toBeGreaterThan(800);
    expect(salon.game.phase).toBe("summary");
    expect(salon.game.firstFinder).toBe("Bob");
  });

  it("tout le monde s'est trompé : fin de manche", () => {
    const salon = salonDeTest();
    for (const u of ["Ana", "Bob"]) {
      joueur(u)("salon_buzz");
      regie()("salon_buzz_judge", { correct: false });
    }
    expect(salon.game.phase).toBe("summary");
  });

  it("points doubles sur une manche spéciale", () => {
    const salon = salonDeTest();
    salon.game.special = "double";
    expect(roundMult(salon.game)).toBe(2);
    joueur("Ana")("salon_buzz");
    regie()("salon_buzz_judge", { correct: true });
    expect(salon.players.Ana.score).toBeGreaterThan(1600);
  });
});

describe("manches spéciales", () => {
  it("jamais en gratuit, désactivées, à la première manche ni deux de suite", () => {
    const salon = salonDeTest();
    salon.settings.specials = true;
    salon.game.currentRound = 3;
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(drawSpecial(salon)).toBe("double");
    salon.game.special = "double";
    expect(drawSpecial(salon)).toBeNull();
    salon.game.special = null;
    salon.game.currentRound = 1;
    expect(drawSpecial(salon)).toBeNull();
    salon.game.currentRound = 3;
    salon.settings.specials = false;
    expect(drawSpecial(salon)).toBeNull();
    salon.settings.specials = true;
    salon.pro = false;
    expect(drawSpecial(salon)).toBeNull();
    vi.restoreAllMocks();
  });
});

describe("entracte et podium final", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    sent.length = 0;
  });

  it("entracte avec ou sans heure de reprise, seulement entre deux parties", () => {
    const salon = salonDeTest();
    regie()("salon_intermission", { minutes: 10 });
    expect(salon.intermission).toBeUndefined();
    salon.game.phase = "gameover";
    regie()("salon_intermission", { minutes: 10 });
    expect(salon.intermission.until).toBeGreaterThan(Date.now() + 9 * 60000);
    regie()("salon_intermission", { minutes: 0 });
    expect(salon.intermission.until).toBeNull();
    regie()("salon_evening_close");
    expect(salon.intermission).toBeNull();
  });

  it("le podium final demande au moins une partie terminée", () => {
    const salon = salonDeTest();
    salon.game.phase = "gameover";
    regie()("salon_finale");
    expect(salon.finale).toBeFalsy();
    salon.nightGames = 2;
    salon.players.Ana.night = 900;
    regie()("salon_finale");
    const [, view] = sent.at(-1);
    expect(view.finale.players[0]).toMatchObject({
      username: "Ana",
      score: 900,
    });
  });

  it("podium final : le téléphone reçoit sa place, pas la liste", () => {
    const salon = salonDeTest();
    const bob = telephone(CODE, "Bob");
    salon.game.phase = "gameover";
    salon.nightGames = 1;
    salon.players.Ana.night = 900;
    salon.players.Bob.night = 100;
    regie()("salon_finale");
    const [ev, vue] = bob.at(-1);
    expect(ev).toBe("salon_evening");
    expect(vue.finale).not.toHaveProperty("players");
    expect(vue.finale.ranking.me).toMatchObject({ username: "Bob", rank: 2 });
    expect(vue.finale.ranking.count).toBe(2);
  });

  it("liste des joueurs : le téléphone reçoit son équipe, pas les membres", () => {
    const salon = salonDeTest();
    salon.settings.teams = [
      { id: 0, name: "A" },
      { id: 1, name: "B" },
    ];
    salon.players.Bob.team = 1;
    const bob = telephone(CODE, "Bob");
    broadcastRoster(CODE, io);
    const [, vue] = bob.find(([ev]) => ev === "salon_roster");
    expect(vue.team).toBe(1);
    expect(vue).not.toHaveProperty("players");
    expect(vue.roster).toEqual({
      recent: [
        { username: "Ana", team: null },
        { username: "Bob", team: 1 },
      ],
      count: 2,
    });
    expect(vue.teams.find((t) => t.id === 1)).toMatchObject({ size: 1 });
    expect(vue.teams[0]).not.toHaveProperty("members");
  });
});
