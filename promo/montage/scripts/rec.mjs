// Outils communs de prise de vue : navigateur téléphone + enregistrement image par image (CDP) dans public/rec/<nom>/
import { chromium } from "playwright-core";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const FF = "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
export const W = +process.env.PHONE_W || 430;
export const H = +process.env.PHONE_H || 932;
const DPR = 2.5;

export async function phone({ theme } = {}) {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
  });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
  });
  if (theme)
    await ctx.addInitScript((t) => localStorage.setItem("zik_theme", t), theme);
  // Pas de visite guidée pendant la prise
  await ctx.addInitScript(() =>
    localStorage.setItem("zik_onboarding_done", "1"),
  );
  return { browser, page: await ctx.newPage() };
}

// marks : instants nommés (ex. « tap1 ») enregistrés dans index.json pour caler le montage
// nth : une image sur n (écran TV en 1920×1080, sinon trop lourd)
export async function record(page, name, { nth = 1 } = {}) {
  const { width, height } = page.viewportSize();
  const dpr = await page.evaluate(() => devicePixelRatio);
  const dir = `public/rec/${name}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = [];
  const marks = {};
  const cdp = await page.context().newCDPSession(page);
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    // 30 images/s suffisent au montage (Remotion recopie public/ à chaque rendu)
    if (frames.length && metadata.timestamp - frames.at(-1)[1] < 1 / 30) {
      cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
      return;
    }
    const f = `${String(frames.length).padStart(5, "0")}.jpg`;
    writeFileSync(`${dir}/${f}`, Buffer.from(data, "base64"));
    frames.push([f, metadata.timestamp]);
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: width * dpr,
    maxHeight: height * dpr,
    everyNthFrame: nth,
  });
  return {
    mark: (label) => (marks[label] = Date.now() / 1000),
    async stop() {
      await page.waitForTimeout(300);
      await cdp.send("Page.stopScreencast");
      const t0 = frames[0][1];
      const rel = (t) => +(t - t0).toFixed(3);
      writeFileSync(
        `${dir}/index.json`,
        JSON.stringify({
          t0,
          w: width * dpr,
          h: height * dpr,
          frames: frames.map(([f, t]) => [f, rel(t)]),
          marks: Object.fromEntries(
            Object.entries(marks).map(([k, t]) => [k, rel(t)]),
          ),
        }),
      );
      console.log(
        `${dir} : ${frames.length} images, ${rel(frames.at(-1)[1]).toFixed(1)} s`,
      );
    },
  };
}

// Son de la page : Chrome ne laisse pas capturer l'onglet en mode automatisé (silence), on journalise donc
// les lectures de <audio> (instant, fichier, position) et on récupère les octets exacts lus par la page.
// stop() remixe ces morceaux sur l'horloge de la capture → public/rec/<nom>/audio.wav (mono 44,1 kHz)
export async function recordAudio(page, name) {
  const events = [];
  const files = {};
  await page.exposeFunction("__zikAudioEv", (e) => events.push(e));
  await page.exposeFunction("__zikAudioFile", (src, b64) => {
    files[src] = Buffer.from(b64, "base64");
  });
  await page.addInitScript(() => {
    const got = new Set();
    const grab = async (src) => {
      if (!src || got.has(src)) return;
      got.add(src);
      const buf = new Uint8Array(await (await fetch(src)).arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000)
        bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      window.__zikAudioFile(src, btoa(bin));
    };
    for (const ev of [
      "playing",
      "pause",
      "seeking",
      "seeked",
      "waiting",
      "emptied",
      "ended",
      "volumechange",
    ])
      document.addEventListener(
        ev,
        (e) => {
          const a = e.target;
          if (!(a instanceof HTMLMediaElement)) return;
          window.__zikAudioEv({
            ev,
            t: Date.now() / 1000,
            src: a.currentSrc,
            ct: a.currentTime,
            paused: a.paused,
            vol: a.muted ? 0 : a.volume,
          });
          if (ev === "playing") grab(a.currentSrc).catch(() => {});
        },
        true,
      );
  });
  return {
    async stop() {
      await page.waitForTimeout(1500);
      const { execFileSync } = await import("node:child_process");
      const { readFileSync } = await import("node:fs");
      const dir = `public/rec/${name}`;
      const idx = JSON.parse(readFileSync(`${dir}/index.json`, "utf8"));
      const t0 = idx.t0;
      const SR = 44100;
      const out = new Float32Array(Math.ceil((idx.frames.at(-1)[1] + 1) * SR));
      const pcm = {};
      const decode = (src) => {
        if (pcm[src] || !files[src]) return pcm[src];
        writeFileSync(`${dir}/tmp.bin`, files[src]);
        execFileSync(FF, [
          "-y",
          "-loglevel",
          "error",
          "-i",
          `${dir}/tmp.bin`,
          "-ac",
          "1",
          "-ar",
          String(SR),
          "-c:a",
          "pcm_s16le",
          `${dir}/tmp.wav`,
        ]);
        const b = readFileSync(`${dir}/tmp.wav`);
        const data = b.indexOf("data") + 8;
        pcm[src] = new Int16Array(
          b.buffer.slice(
            b.byteOffset + data,
            b.byteOffset + b.length - ((b.length - data) % 2),
          ),
        );
        return pcm[src];
      };
      // Un morceau = de « playing »/« seeked » (en lecture) jusqu'à l'événement suivant
      let n = 0;
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (!(e.ev === "playing" || (e.ev === "seeked" && !e.paused))) continue;
        const next = events
          .slice(i + 1)
          .find((x) =>
            [
              "pause",
              "seeking",
              "waiting",
              "emptied",
              "ended",
              "playing",
            ].includes(x.ev),
          );
        const end = next ? next.t : e.t + 30;
        const p = decode(e.src);
        if (!p) continue;
        const at = Math.round((e.t - t0) * SR);
        const from = Math.round(e.ct * SR);
        const len = Math.round((end - e.t) * SR);
        for (let k = 0; k < len && from + k < p.length; k++)
          if (at + k >= 0 && at + k < out.length)
            out[at + k] = (p[from + k] / 32768) * e.vol;
        n++;
      }
      const wav = Buffer.alloc(44 + out.length * 2);
      wav.write("RIFF", 0);
      wav.writeUInt32LE(36 + out.length * 2, 4);
      wav.write("WAVEfmt ", 8);
      wav.writeUInt32LE(16, 16);
      wav.writeUInt16LE(1, 20);
      wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(SR, 24);
      wav.writeUInt32LE(SR * 2, 28);
      wav.writeUInt16LE(2, 32);
      wav.writeUInt16LE(16, 34);
      wav.write("data", 36);
      wav.writeUInt32LE(out.length * 2, 40);
      out.forEach((v, k) =>
        wav.writeInt16LE(
          Math.max(-32768, Math.min(32767, Math.round(v * 32767))),
          44 + k * 2,
        ),
      );
      writeFileSync(`${dir}/audio.wav`, wav);
      writeFileSync(`${dir}/audio-events.json`, JSON.stringify(events));
      rmSync(`${dir}/tmp.bin`, { force: true });
      rmSync(`${dir}/tmp.wav`, { force: true });
      console.log(
        `${dir}/audio.wav : ${n} morceaux, ${Object.keys(files).length} fichiers`,
      );
    },
  };
}
