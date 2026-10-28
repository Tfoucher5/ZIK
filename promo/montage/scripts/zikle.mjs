// Filme une partie de Zikle en local (passerelle lecture seule + scripts/dev-promo.sh) : 2 essais ratés, trouvé au 3e.
// node scripts/zikle.mjs [nom=zikle] [ratés=jul,aya nakamura]  → public/rec/<nom>/ (+ marks essai1..3)
// La réponse du jour est lue via la passerelle ; la fin de partie (zikle_complete) est avalée par la passerelle.
import { readFileSync } from "node:fs";
import { phone, record } from "./rec.mjs";

const [name = "zikle", misses = "jul,aya nakamura"] = process.argv.slice(2);
const env = Object.fromEntries(
  readFileSync("../../../ZIK/.env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l
        .slice(l.indexOf("=") + 1)
        .trim()
        .replace(/^"|"$/g, ""),
    ]),
);
// La chanson du jour est protégée : clé serveur, en lecture (GET) uniquement
const key = env.SUPABASE_SERVICE_KEY;
const [day] = await (
  await fetch(
    `http://127.0.0.1:54321/rest/v1/daily_songs?select=date,tracks(artist,title)&date=eq.${new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" })}`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  )
).json();
const answer = day.tracks;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { browser, page } = await phone();
await page.goto("http://127.0.0.1:5173/zikle", { waitUntil: "networkidle" });
const rec = await record(page, name);
await sleep(1200);
await page.locator(".zk-play").first().tap();
await sleep(2500);

const guess = async (text, pickAnswer) => {
  const input = page.locator(".zk-search-input");
  await input.pressSequentially(text, { delay: 120 });
  // La liste se rafraîchit pendant la frappe : on attend qu'elle soit stable, puis on choisit au clavier
  await sleep(1500);
  await page.waitForSelector(".zk-suggestions button", { timeout: 10000 });
  const texts = (
    await page.locator(".zk-suggestions button").allInnerTexts()
  ).map((t) => t.toLowerCase());
  const title = answer.title.toLowerCase();
  const i = pickAnswer
    ? texts.findIndex((t) => t.includes(title))
    : texts.findIndex((t) => !t.includes(title));
  for (let k = 0; k <= Math.max(0, i); k++)
    await input.press("ArrowDown", { delay: 120 });
  await input.press("Enter");
};

const wrong = misses.split(",");
for (let n = 0; n < wrong.length; n++) {
  rec.mark(`essai${n + 1}`);
  await guess(wrong[n], false);
  await sleep(2600);
}
rec.mark(`essai${wrong.length + 1}`);
// Le titre est plus sûr que l'artiste : un artiste prolifique noie le bon morceau hors des suggestions
await guess(answer.title.toLowerCase(), true);
await sleep(6000);
await rec.stop();
await browser.close();
console.log(`Réponse : ${answer.artist} - ${answer.title}`);
