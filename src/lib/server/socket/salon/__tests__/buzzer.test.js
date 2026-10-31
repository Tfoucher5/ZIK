import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../persist.js", () => ({ recordSalonGameEnd: () => {} }));
vi.mock("../session.js", () => ({
  prepareSession: () => {},
  prefetchNextVideo: () => {},
  drawSpareTrack: () => {},
}));

const { salonRooms } = await import("../../../state.js");
const { registerBuzzer } = await import("../buzzer.js");
const { registerEvening } = await import("../evening.js");
const { addPlayer } = await import("../players.js");
const { drawSpecial, roundMult } = await import("../specials.js");

const CODE = "BUZZ01";
const sent = [];
const io = { to: () => ({ emit: (ev, d) => sent.push([ev, d]) }) };

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
});
