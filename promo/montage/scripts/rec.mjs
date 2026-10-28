// Outils communs de prise de vue : navigateur téléphone + enregistrement image par image (CDP) dans public/rec/<nom>/
import { chromium } from "playwright-core";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

export const W = 430;
export const H = 932;
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
export async function record(page, name) {
  const dir = `public/rec/${name}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = [];
  const marks = {};
  const cdp = await page.context().newCDPSession(page);
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const f = `${String(frames.length).padStart(5, "0")}.jpg`;
    writeFileSync(`${dir}/${f}`, Buffer.from(data, "base64"));
    frames.push([f, metadata.timestamp]);
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: W * DPR,
    maxHeight: H * DPR,
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
          w: W * DPR,
          h: H * DPR,
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
