import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(
  new URL("../../../package.json", import.meta.url),
);
const { io } = require("socket.io-client");
export const URL = "http://127.0.0.1:5173";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function answer() {
  const lines = readFileSync(process.env.DEV_LOG || "dev.log", "utf8")
    .split("\n")
    .filter((l) => l.startsWith("[PROMO] "));
  return JSON.parse(lines.at(-1).slice(8));
}
export function strip(s) {
  return s.replace(/\s*\([^)]*\)/g, "").trim();
}

// bots : [{ name, a:[min,max] s délai artiste, t:[min,max] délai titre, miss: proba de rater }]
export function startBots(roomId, bots, { qcm = false } = {}) {
  const socks = bots.map((b) => {
    const s = io(URL, { transports: ["websocket"] });
    s.on("connect", () =>
      s.emit("join_room", {
        roomId,
        username: b.name,
        userId: null,
        isGuest: true,
      }),
    );
    s.on("start_round", () => {
      setTimeout(() => s.emit("player_ready"), 300 + Math.random() * 500);
    });
    s.on("round_start_sync", () => {
      if (Math.random() < (b.miss ?? 0)) return;
      const ans = answer();
      const r = (x) => (x[0] + Math.random() * (x[1] - x[0])) * 1000;
      if (qcm) {
        setTimeout(() => {
          const idx = (s._choices || []).findIndex((c) =>
            c.toLowerCase().includes(strip(ans.t).toLowerCase()),
          );
          s.emit("submit_choice", { choiceIndex: idx >= 0 ? idx : 0 });
        }, r(b.a));
      } else {
        setTimeout(() => s.emit("submit_guess", strip(ans.a)), r(b.a));
        setTimeout(() => s.emit("submit_guess", strip(ans.t)), r(b.t));
      }
    });
    s.on("start_round", (d) => {
      s._choices = d.choices;
    });
    return s;
  });
  return () => socks.forEach((s) => s.disconnect());
}

// Enregistre l'écran via CDP : images JPEG + horodatage
export async function record(
  page,
  dir,
  { maxWidth = 1080, maxHeight = 2400 } = {},
) {
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let n = 0;
  cdp.on("Page.screencastFrame", async (f) => {
    const file = `${dir}/f${String(n++).padStart(5, "0")}.jpg`;
    writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    cdp
      .send("Page.screencastFrameAck", { sessionId: f.sessionId })
      .catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth,
    maxHeight,
    everyNthFrame: 1,
  });
  const marks = [];
  return {
    mark(label) {
      marks.push({ label, t: Date.now() / 1000 });
    },
    async stop() {
      await cdp.send("Page.stopScreencast").catch(() => {});
      await sleep(300);
      const t0 = frames[0]?.t ?? 0;
      writeFileSync(
        `${dir}/index.json`,
        JSON.stringify(
          {
            frames: frames.map((f) => ({
              f: f.file.split("/").pop(),
              t: +(f.t - t0).toFixed(3),
            })),
            marks: marks.map((m) => ({ ...m, t: +(m.t - t0).toFixed(3) })),
          },
          null,
          0,
        ),
      );
      return frames.length;
    },
  };
}

export async function typeLikeHuman(page, sel, text) {
  await page.click(sel);
  for (const ch of text) {
    await page.keyboard.type(ch);
    await sleep(70 + Math.random() * 70);
  }
}
