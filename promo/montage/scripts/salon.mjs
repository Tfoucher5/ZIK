// Filme une soirée ZIK Soirée sur le STAGING (jamais la prod) : TV 1920×1080, régie (tablette), 4 téléphones 390×844.
// node scripts/salon.mjs <nom> [--qcm] [--manches 5] [--url http://localhost:5173]
// Salon invité créé par l'interface /salon : aucun compte, aucun mail, aucune notification, aucun paiement.
// Sortie : public/rec/<nom>-creation, -tv, -regie, -karim, -lea, -zoe (marks : lance, mancheN, trouveN-<joueur>,
// revelationN, podium) ; Hugo joue sans être filmé. Réponse lue dans la régie, comme le scénario e2e du salon.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { record } from "./rec.mjs";

const ZIK = new URL("../../../../ZIK/", import.meta.url);
createRequire(ZIK)("dotenv").config({
  path: fileURLToPath(new URL(".env", ZIK)),
  quiet: true,
});
const { assertCibleAutorisee, DEV_URL } = await import(
  new URL("scripts/charge-salon-outils.mjs", ZIK)
);

const args = process.argv.slice(2);
const opt = (k, d) =>
  args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d;
const [name] = args;
if (!name) throw new Error("Usage : node scripts/salon.mjs <nom> [--qcm]");
const qcm = args.includes("--qcm");
const N = +opt("manches", 5);
// Garde-fou du dépôt principal : staging ou localhost, et .env sur la base de staging
const APP = assertCibleAutorisee(
  opt("url", DEV_URL),
  process.env.SUPABASE_URL ?? "",
);

// rapide ≈ 3,5 s | normal ≈ 5 s | lent ≈ 10 s | faux = mauvaises réponses | fauxjuste = faux puis juste | rien
const JOUEURS = [
  { nom: "Karim", id: "karim", plan: "rapide,rapide,normal,rien,lent" },
  { nom: "Léa", id: "lea", plan: "normal,lent,rien,normal,lent" },
  { nom: "Zoé", id: "zoe", plan: "faux,fauxjuste,rapide,rapide,rapide" },
  { nom: "Hugo", id: null, plan: "rien,lent,rien,faux,rien" },
];
const DECOYS = ["Jul", "Ninho", "Gims", "Angèle", "Orelsan", "Indila"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\s*[([][^)\]]*[)\]]/g, "")
    .trim();

// camera : image JPEG servie comme flux de la caméra (Chrome lit un .mjpeg en boucle)
const launch = (camera) =>
  chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: [
      "--hide-scrollbars",
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      ...(camera ? [`--use-file-for-fake-video-capture=${camera}`] : []),
    ],
  });
const browser = await launch();
const context = (o, b = browser) =>
  b.newContext({ locale: "fr-FR", ...o }).then(async (c) => {
    await c.addInitScript(() =>
      localStorage.setItem("zik_onboarding_done", "1"),
    );
    return c;
  });
const recs = [];
const markAll = (label) => recs.forEach((r) => r.mark(label));

// 1. Création sur la TV
const tv = await (
  await context({ viewport: { width: 1920, height: 1080 } })
).newPage();
await tv.goto(`${APP}/salon`, { waitUntil: "networkidle" });
const creation = await record(tv, `${name}-creation`, { nth: 2 });
await sleep(1500);
const tuile = (t) => tv.locator(".pp-sleeve").filter({ hasText: t }).first();
await tuile("Années 2000").click();
await sleep(600);
if ((await tuile("Chanson française").getAttribute("aria-pressed")) === "true")
  await tuile("Chanson française").click();
await sleep(800);
// N manches (5, 10, 15 ou 20), 20 s pour répondre, mode de réponse, réponse affichée 5 s
const reponses = qcm ? /4 choix/ : /Texte libre/;
for (const n of [new RegExp("^" + N + "$"), "20 s", reponses, "5 s"]) {
  await tv.getByRole("radio", { name: n }).first().click();
  await sleep(500);
}
await tv.getByRole("button", { name: "Ouvrir l'écran TV" }).click();
await tv.locator(".sh-join-code").waitFor();
await creation.stop();
// Clé de régie gardée par le navigateur qui a créé le salon (salonClient.js)
const { code, key } = await tv.evaluate(() => {
  const { code } = JSON.parse(localStorage.getItem("zik_salon_last"));
  return { code, key: localStorage.getItem(`zik_salon_key_${code}`) };
});
recs.push(await record(tv, `${name}-tv`, { nth: 2 }));
console.log(`Salon ${code} sur ${APP}`);

// 2. Régie sur tablette
const regie = await (
  await context({
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    hasTouch: true,
  })
).newPage();
await regie.goto(`${APP}/salon/regie?code=${code}&key=${key}`);
recs.push(await record(regie, `${name}-regie`));

// 3. Téléphones : Karim scanne le QR de la TV (BarcodeDetector simulé comme dans e2e/scanQr.spec.js)
const tels = [];
// Karim scanne la vraie TV : sa caméra simulée montre une photo de l'écran
const camera = fileURLToPath(
  new URL(`../out/${name}-camera.mjpeg`, import.meta.url),
);
// Cadrage portrait centré sur le QR, comme un téléphone tenu face à la TV
const qr = await tv.locator(".sh-lobby .sh-qr").boundingBox();
const cx = Math.min(1920 - 300, Math.max(300, qr.x + qr.width / 2));
await tv.screenshot({
  path: camera,
  type: "jpeg",
  quality: 90,
  clip: { x: cx - 300, y: 6, width: 600, height: 1066 },
});
const browserKarim = await launch(camera);
for (const [i, j] of JOUEURS.entries()) {
  const ctx = await context(
    {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.5,
      isMobile: true,
      hasTouch: true,
      permissions: i === 0 ? ["camera"] : [],
    },
    i === 0 ? browserKarim : browser,
  );
  if (i === 0)
    await ctx.addInitScript((raw) => {
      window.BarcodeDetector = class {
        static getSupportedFormats() {
          return Promise.resolve(["qr_code"]);
        }
        detect() {
          return new Promise((r) =>
            setTimeout(() => r([{ rawValue: raw }]), 2200),
          );
        }
      };
    }, `https://www.zik-music.fr/salon/play?code=${code}`);
  const page = await ctx.newPage();
  await page.goto(`${APP}/salon/play${i === 0 ? "" : `?code=${code}`}`);
  if (j.id) recs.push(await record(page, `${name}-${j.id}`));
  tels.push(page);
}
await sleep(2000);
for (const [i, page] of tels.entries()) {
  if (i === 0) {
    await page
      .getByRole("button", { name: "Scanner le QR code de la TV" })
      .tap();
    await page.waitForFunction(
      (c) => document.querySelector(".sp-code-input")?.value === c,
      code,
    );
    await sleep(500);
  } else await page.locator(".sp-code-input").fill(code);
  await page
    .getByPlaceholder("Ex. : Julie")
    .pressSequentially(JOUEURS[i].nom, { delay: 120 });
  await page.getByRole("button", { name: "Rejoindre", exact: true }).tap();
  markAll(`arrive-${JOUEURS[i].id ?? "hugo"}`);
  await sleep(1800);
}
await sleep(2500);
await regie
  .getByRole("button", { name: "Lancer la partie", exact: true })
  .click();
markAll("lance");

// 4. Réponses lues dans la régie, une par manche
const answers = [];
const ready = Array.from(
  { length: N },
  (_, i) => new Promise((r) => (answers[i] = r)),
);
// La régie remasque la réponse quand la musique démarre : on ne garde qu'un titre nouveau par manche
let precedent = null;
async function lireReponse() {
  for (;;) {
    await regie.locator(".ra-voir").waitFor({ timeout: 120000 });
    await regie.locator(".ra-voir").click();
    const b = regie.locator(".ra-id b");
    await b
      .and(regie.locator(':not([aria-label="Réponse masquée"])'))
      .waitFor();
    const txt = await b.getAttribute("aria-label");
    if (txt !== precedent) return (precedent = txt);
    await regie
      .locator(".ra-voir")
      .waitFor({ state: "detached" })
      .catch(() => {});
  }
}
const regieLoop = (async () => {
  for (let m = 0; m < N; m++) {
    const txt = await lireReponse();
    markAll(`manche${m + 1}`);
    const cut = txt.indexOf(" - ");
    answers[m]({ full: txt, a: txt.slice(0, cut), t: txt.slice(cut + 3) });
    console.log(`manche ${m + 1} : ${txt}`);
  }
})();

const tvLoop = (async () => {
  for (let m = 1; m <= N; m++) {
    await tv.locator(".sh-reveal").waitFor({ timeout: 120000 });
    markAll(`revelation${m}`);
    const fin = { state: "detached", timeout: 120000 };
    await tv
      .locator(".sh-reveal")
      .waitFor(fin)
      .catch(() => {});
  }
})();

async function jouer(page, j) {
  const plan = j.plan.split(",");
  for (let m = 1; m <= N; m++) {
    const mode = plan[(m - 1) % plan.length];
    await page.getByText(`Manche ${m} / ${N}`).waitFor({ timeout: 120000 });
    const champ = qcm
      ? page.locator(".sx-choices .sx-choice").first()
      : page.locator("#salon-guess-input");
    await champ.waitFor({ timeout: 120000 });
    const a = await ready[m - 1];
    if (mode === "rien") continue;
    const wait = {
      rapide: 1800,
      normal: 3800,
      lent: 9000,
      faux: 2500,
      fauxjuste: 2500,
    }[mode];
    await sleep(wait + Math.random() * 400);
    if (qcm) {
      const btns = page.locator(".sx-choices .sx-choice");
      const texts = (await btns.allInnerTexts()).map(norm);
      const good = Math.max(
        0,
        texts.findIndex((t) => t === norm(a.full) || t.includes(norm(a.t))),
      );
      const pick = mode.startsWith("faux")
        ? (good + 1 + (m % 3)) % texts.length
        : good;
      await btns
        .nth(pick)
        .tap()
        .catch(() => {});
    } else {
      const input = page.locator("#salon-guess-input");
      const type = async (txt, delay) => {
        await input.pressSequentially(txt, { delay }).catch(() => {});
        await input.press("Enter").catch(() => {});
      };
      const leurres = DECOYS.filter((d) => norm(d) !== norm(a.a)).sort(
        () => Math.random() - 0.5,
      );
      if (mode.startsWith("faux")) {
        await type(leurres[0].toLowerCase(), 130);
        await sleep(mode === "faux" ? 3500 : 2500);
        if (mode === "faux") {
          await type(leurres[1].toLowerCase(), 130);
          continue;
        }
      }
      const d = mode === "rapide" ? 45 : 100;
      await type(norm(a.a), d);
      await sleep(mode === "rapide" ? 250 : 800);
      await type(norm(a.t), d);
    }
    markAll(`trouve${m}-${j.id ?? "hugo"}`);
  }
}

await Promise.all([
  regieLoop,
  tvLoop,
  ...tels.map((p, i) => jouer(p, JOUEURS[i])),
]);
await tv.getByText(/Vainqueur ·/).waitFor({ timeout: 120000 });
markAll("podium");
await sleep(14000);
for (const r of recs) await r.stop();
await browserKarim.close();
await browser.close();
