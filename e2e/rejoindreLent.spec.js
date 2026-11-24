// Réseau lent : « Rejoindre » touché avant que le JavaScript soit prêt partait
// dans le vide. Le formulaire envoie maintenant le code et le pseudo dans
// l'adresse, et la page rejoint seule une fois chargée.
import { test, expect, devices } from "@playwright/test";
import { jetonDeTest, PLAYLIST } from "../scripts/charge-salon-outils.mjs";

test("« Rejoindre » avant le chargement du JavaScript : le joueur entre quand même", async ({
  browser,
  request,
}) => {
  const jeton = await jetonDeTest();
  const res = await request.post("/api/salon", {
    headers: { authorization: `Bearer ${jeton}` },
    data: {
      playlistIds: [PLAYLIST],
      settings: { answerMode: "free", maxRounds: 3 },
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const { code, key } = await res.json();

  const tv = await (
    await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  ).newPage();
  await tv.goto(`/salon/host?code=${code}&key=${key}`);

  // Page encore sans JavaScript : tuiles du QR rendues par le serveur
  const sansJs = await (
    await browser.newContext({
      ...devices["iPhone 13"],
      javaScriptEnabled: false,
    })
  ).newPage();
  await sansJs.goto(`/salon/play?code=${code}`);
  await expect(sansJs.locator(".sp-tuiles")).toBeVisible();
  await sansJs.getByPlaceholder("Ex. : Julie").fill("Alice");
  await sansJs.getByRole("button", { name: "Rejoindre", exact: true }).click();
  await expect(sansJs).toHaveURL(new RegExp(`code=${code}&pseudo=Alice`));
  const envoi = sansJs.url();

  // Même adresse, JavaScript prêt : jonction sans nouvel appui, adresse nettoyée
  const tel = await (await browser.newContext(devices["iPhone 13"])).newPage();
  await tel.goto(envoi);
  await expect(tel.locator(".sp-join")).toBeHidden({ timeout: 30_000 });
  await expect(tel).not.toHaveURL(/pseudo=/);
  await expect(tv.getByText("Alice").first()).toBeVisible({ timeout: 30_000 });
});
