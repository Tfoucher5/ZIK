// Filme un vrai écran de ZIK en format téléphone → public/rec/<nom>/ (images JPEG + index.json, lu par <Rec>)
// node scripts/capture.mjs <nom> <chemin> "<actions>" [--theme dark] [--base http://127.0.0.1:5173]
// Actions séparées par « ; » :
//   wait 1500 | scroll 900 1200 (px, ms) | tap <sélecteur CSS> | type <sélecteur> <texte> | hover <sélecteur> | shot <sélecteur> <nom>
// Prod (www.zik-music.fr) en lecture seule : pas d'inscription, pas de room, pas de réponse envoyée.
import { phone, record } from "./rec.mjs";

const args = process.argv.slice(2);
const opt = (k, d) =>
  args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d;
const [name, path, script = "wait 3000"] = args;

const { browser, page } = await phone({ theme: opt("theme", null) });
await page.goto(opt("base", "https://www.zik-music.fr") + path, {
  waitUntil: "networkidle",
});
const rec = await record(page, name);

for (const step of script
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean)) {
  const [cmd, ...rest] = step.split(" ");
  if (cmd === "wait") await page.waitForTimeout(Number(rest[0]));
  else if (cmd === "scroll") {
    const [dy, ms = 1000] = rest.map(Number);
    await page.evaluate(
      ([dy, ms]) =>
        new Promise((done) => {
          const y0 = scrollY;
          const t0 = performance.now();
          const step = (now) => {
            const p = Math.min(1, (now - t0) / ms);
            scrollTo(
              0,
              y0 + dy * (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
            );
            p < 1 ? requestAnimationFrame(step) : done();
          };
          requestAnimationFrame(step);
        }),
      [dy, ms],
    );
  } else if (cmd === "tap") await page.locator(rest.join(" ")).first().tap();
  else if (cmd === "hover") await page.locator(rest.join(" ")).first().hover();
  else if (cmd === "type")
    await page
      .locator(rest[0])
      .first()
      .pressSequentially(rest.slice(1).join(" "), { delay: 90 });
  else if (cmd === "shot") {
    // Photo d'un élément (sections de page à animer) : shot <sélecteur> <nom> → public/rec/<capture>/<nom>.png
    const el = page.locator(rest[0]).first();
    // La barre d'onglets fixe du bas s'incrusterait dans la photo
    await page.evaluate(() =>
      document.querySelectorAll("body *").forEach((n) => {
        const s = getComputedStyle(n);
        if (
          s.position === "fixed" &&
          n.getBoundingClientRect().top > innerHeight / 2
        )
          n.style.visibility = "hidden";
      }),
    );
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await el.screenshot({
      path: `public/rec/${name}/${rest[1]}.png`,
      animations: "disabled",
    });
  } else throw new Error(`Action inconnue : ${cmd}`);
}

await rec.stop();
await browser.close();
