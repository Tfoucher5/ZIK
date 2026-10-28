// Filme une vraie partie ZIK en local (passerelle lecture seule + scripts/dev-promo.sh) avec des bots.
// node scripts/partie.mjs <nom> <code room> [--qcm] [--plan normal,rapide,hesite,faux] [--theme dark]
// --plan : comportement du joueur filmé, une entrée par manche
//   normal = bonne réponse après 2-3 s | rapide = bonne réponse en 1 s | hesite = commence, efface, laisse filer le temps
//   faux = mauvaises réponses (saisie libre : 2 artistes au hasard) | rien = ne répond pas
// Ex. : node scripts/partie.mjs rapfr KDP2G9 --plan rapide,hesite,faux,normal
// Pré-requis temporaire (jamais commité) : la ligne console.log("[PROMO] …") après
// `game.currentTrack = game.sessionPlaylist.pop()` dans src/lib/server/socket/game/rounds.js du worktree master,
// et la sortie du serveur dans out/dev.log. Les bots et le joueur lisent la réponse dans ces lignes.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { phone, record } from "./rec.mjs";

const { io } = createRequire(
  new URL("../../../../ZIK/package.json", import.meta.url),
)("socket.io-client");
const args = process.argv.slice(2);
const opt = (k, d) =>
  args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d;
const [name, room] = args;
const qcm = args.includes("--qcm");
const plan = opt("plan", "normal,normal,faux").split(",");
const DECOYS = [
  "Jul",
  "Ninho",
  "Booba",
  "Aya Nakamura",
  "Gims",
  "SCH",
  "Angèle",
  "Orelsan",
];
const APP = "http://127.0.0.1:5173";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
const answer = () => {
  const l = readFileSync("out/dev.log", "utf8")
    .split("\n")
    .filter((x) => x.includes("[PROMO] "));
  return JSON.parse(l.at(-1).slice(l.at(-1).indexOf("[PROMO] ") + 8));
};

const BOTS = [
  { name: "julie.mp3", d: [2.5, 6], miss: 0.15 },
  { name: "Karim_B", d: [3.5, 9], miss: 0.2 },
  { name: "Lulu", d: [5, 12], miss: 0.3 },
];
const socks = BOTS.map((b) => {
  const s = io(APP, { transports: ["websocket"] });
  s.on("connect", () =>
    s.emit("join_room", {
      roomId: room,
      username: b.name,
      userId: null,
      isGuest: true,
    }),
  );
  s.on("start_round", (d) => {
    s._choices = d?.choices || [];
    setTimeout(() => s.emit("player_ready"), 300 + Math.random() * 500);
  });
  s.on("round_start_sync", () => {
    if (Math.random() < b.miss) return;
    const a = answer();
    const delay = (b.d[0] + Math.random() * (b.d[1] - b.d[0])) * 1000;
    if (qcm) {
      const i = s._choices.findIndex((c) => norm(c).includes(norm(a.t)));
      setTimeout(
        () => s.emit("submit_choice", { choiceIndex: i >= 0 ? i : 0 }),
        delay,
      );
    } else {
      setTimeout(() => s.emit("submit_guess", norm(a.a)), delay);
      setTimeout(() => s.emit("submit_guess", norm(a.t)), delay + 1500);
    }
  });
  return s;
});

const { browser, page } = await phone({ theme: opt("theme", null) });
await page.goto(
  `${APP}/game?roomId=${room}&username=Toi&isGuest=1&gameMode=${qcm ? "qcm" : "classic"}`,
  { waitUntil: "networkidle" },
);
const rec = await record(page, name);

for (let r = 1; r <= plan.length; r++) {
  const mode = plan[r - 1];
  const ready = qcm
    ? ".g-qcm-btn:not([disabled])"
    : "#guessInput:not([disabled])";
  await page.waitForSelector(ready, { timeout: 120000 });
  rec.mark(`manche${r}`);
  const a = answer();
  await sleep(
    mode === "rapide"
      ? 700
      : mode === "normal"
        ? 1800 + Math.random() * 1200
        : 2500,
  );
  if (qcm) {
    const btns = page.locator(".g-qcm-btn");
    const texts = (await btns.allInnerTexts()).map(norm);
    const good = Math.max(
      0,
      texts.findIndex((t) => t.includes(norm(a.t))),
    );
    if (mode === "faux")
      await btns
        .nth((good + 1 + Math.floor(Math.random() * 3)) % texts.length)
        .tap();
    else if (mode === "normal" || mode === "rapide") await btns.nth(good).tap();
  } else {
    const input = page.locator("#guessInput:not([disabled])").first();
    const type = async (txt, delay = 110) => {
      await input.pressSequentially(txt, { delay });
      await input.press("Enter");
    };
    if (mode === "normal" || mode === "rapide") {
      await type(norm(a.a), mode === "rapide" ? 45 : 110);
      await sleep(mode === "rapide" ? 300 : 900);
      await type(norm(a.t), mode === "rapide" ? 45 : 110);
    } else if (mode === "faux") {
      for (const d of DECOYS.filter((x) => norm(x) !== norm(a.a))
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)) {
        await type(d.toLowerCase());
        await sleep(1600);
      }
    } else if (mode === "hesite") {
      await input.pressSequentially(norm(a.a).slice(0, 3), { delay: 260 });
      await sleep(1400);
      for (let i = 0; i < 3; i++)
        await input.press("Backspace", { delay: 150 });
    }
  }
  rec.mark(`reponse${r}`);
  console.log(`manche ${r} (${mode}) : ${a.a} - ${a.t}`);
  await page
    .waitForSelector(ready, { state: "detached", timeout: 60000 })
    .catch(() => {});
  rec.mark(`fin${r}`);
}
await sleep(7000);
await rec.stop();
socks.forEach((s) => s.disconnect());
await browser.close();
