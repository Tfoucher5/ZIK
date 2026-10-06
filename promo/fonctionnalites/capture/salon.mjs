import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import { URL, sleep, answer, strip, record, typeLikeHuman } from "./lib.mjs";
const require = createRequire(
  new URL("../../../package.json", import.meta.url),
);
const { io } = require("socket.io-client");
const OUT = process.argv[2];
const tvB = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium",
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--force-device-scale-factor=1.5",
  ],
});
const phB = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium",
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--force-device-scale-factor=2.5",
  ],
});
const tv = await (
  await tvB.newContext({ viewport: { width: 1280, height: 720 } })
).newPage();
await tv.goto(`${URL}/salon`, { waitUntil: "networkidle" });
await tv.getByRole("radio", { name: /4 choix/ }).click();
await tv.getByRole("radio", { name: "2 équipes" }).click();
await tv.getByText("Ouvrir le salon").click();
await tv.waitForURL(/salon\/host/);
const code = new URLSearchParams(tv.url().split("?")[1]).get("code");
console.log("code", code);
await sleep(2500);
const recTv = await record(tv, `${OUT}_tv`, {
  maxWidth: 1920,
  maxHeight: 1080,
});
const phones = [];
for (const name of ["Julie", "Karim"]) {
  const ctx = await phB.newContext({
    viewport: { width: 430, height: 932 },
    hasTouch: true,
  });
  const p = await ctx.newPage();
  await p.goto(`${URL}/salon/play?code=${code}`, { waitUntil: "networkidle" });
  phones.push({
    name,
    p,
    rec: await record(p, `${OUT}_${name}`, { maxWidth: 1075, maxHeight: 2330 }),
  });
}
const t0 = Date.now();
const mark = (l) => {
  recTv.mark(l);
  phones.forEach((x) => x.rec.mark(l));
  console.log(l, ((Date.now() - t0) / 1000).toFixed(1));
};
await sleep(1500);
for (const ph of phones) {
  await typeLikeHuman(ph.p, "#sp-username", ph.name);
  await ph.p.getByRole("button", { name: "Rejoindre" }).click();
  mark("joined_" + ph.name);
  await sleep(1300);
  await ph.p
    .getByRole("button", { name: ph.name === "Julie" ? /Rouge/ : /Bleue/ })
    .first()
    .click()
    .catch((e) => console.log("team", e.message));
  await sleep(700);
}
const bots = ["Lisa", "Tom", "Inès"].map((n, i) => {
  const s = io(URL, { transports: ["websocket"] });
  s.on("connect", () =>
    setTimeout(
      () => {
        s.emit("salon_join_player", { code, username: n });
        setTimeout(() => s.emit("salon_pick_team", { team: i % 2 }), 800);
      },
      600 + i * 700,
    ),
  );
  let choices = null;
  s.on("salon_round_start", (d) => {
    choices = d?.choices;
  });
  s.on("salon_timer_started", () => {
    const ans = answer();
    setTimeout(
      () => {
        if (choices) {
          const k = choices.findIndex((c) =>
            String(c).toLowerCase().includes(strip(ans.t).toLowerCase()),
          );
          s.emit("salon_submit_choice", {
            choiceIndex: Math.random() < 0.8 && k >= 0 ? k : (k + 1) % 4,
          });
        }
      },
      2500 + Math.random() * 7000,
    );
  });
  return s;
});
await sleep(4000);
for (const ph of phones) {
  await ph.p.screenshot({ path: `${OUT}_${ph.name}_lobby.png` });
}
await tv.screenshot({ path: `${OUT}_tv_lobby.png` });
const evs = new Set();
bots[0].onAny((e) => evs.add(e));
await tv.getByText("Lancer la partie").click();
mark("start");
for (let r = 0; r < 3; r++) {
  const ans0 = answer();
  await phones[0].p.waitForFunction(
    (t) =>
      [...document.querySelectorAll("button")].some(
        (b) => !b.disabled && b.innerText.toLowerCase().includes(t),
      ),
    strip(ans0.t).toLowerCase(),
    { timeout: 60000 },
  );
  mark("choices" + r);
  // tap sur le bon choix depuis les téléphones
  for (const [i, ph] of phones.entries()) {
    await sleep(1800 + i * 1700);
    const ans = answer();
    const hit = await ph.p.evaluate(
      ([t, good]) => {
        const bs = [...document.querySelectorAll("button")].filter(
          (b) => !b.disabled && b.innerText.trim().length > 3,
        );
        const i = bs.findIndex((b) => b.innerText.toLowerCase().includes(t));
        const pick = good
          ? i
          : bs.findIndex((b, k) => k !== i && b.innerText.includes(" - "));
        if (pick >= 0) bs[pick].click();
        return [i, bs.map((b) => b.innerText.replace(/\n/g, " ")).join(" | ")];
      },
      [strip(ans.t).toLowerCase(), !(r === 1 && ph.name === "Karim")],
    );
    console.log("round", r, ph.name, "hit", hit, ans.t);
    mark(`tap${r}_${ph.name}`);
  }
  await tv.screenshot({ path: `${OUT}_tv_r${r}.png` });
  await phones[0].p.screenshot({ path: `${OUT}_ph_r${r}.png` });
  await sleep(9000);
  await tv.screenshot({ path: `${OUT}_tv_r${r}_end.png` });
}
console.log("events", [...evs].join(","));
await recTv.stop();
for (const ph of phones) await ph.rec.stop();
bots.forEach((s) => s.disconnect());
await tvB.close();
await phB.close();
