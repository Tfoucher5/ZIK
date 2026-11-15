// Coupure réseau d'un téléphone, puis retour du même joueur depuis un autre navigateur
import { test, expect, devices } from "@playwright/test";
import { jetonDeTest, PLAYLIST } from "../scripts/charge-salon-outils.mjs";

test("coupure signalée, place rendue par l'hôte à un autre navigateur", async ({
  browser,
  request,
}) => {
  const jeton = await jetonDeTest();
  const res = await request.post("/api/salon", {
    headers: { authorization: `Bearer ${jeton}` },
    data: { playlistIds: [PLAYLIST], settings: { answerMode: "free" } },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const { code, key } = await res.json();

  const tv = await (await browser.newContext()).newPage();
  await tv.goto(`/salon/host?code=${code}&key=${key}`);
  const regie = await (await browser.newContext()).newPage();
  await regie.goto(`/salon/regie?code=${code}&key=${key}`);

  const ctx = await browser.newContext(devices["iPhone 13"]);
  const tel = await ctx.newPage();
  await tel.goto(`/salon/play?code=${code}`);
  await tel.getByPlaceholder("Ex. : Julie").fill("Julie");
  await tel.getByRole("button", { name: "Rejoindre", exact: true }).click();
  await expect(tel.getByPlaceholder("Ex. : Julie")).toBeHidden();

  // Coupure : le bandeau apparaît, puis disparaît au retour du réseau
  await ctx.setOffline(true);
  await expect(tel.getByText("Connexion perdue")).toBeVisible({
    timeout: 30_000,
  });
  await ctx.setOffline(false);
  await expect(tel.getByText("Connexion perdue")).toBeHidden({
    timeout: 30_000,
  });

  // Autre navigateur, sans jeton : « c'est toi ? », l'hôte confirme
  const autre = await (
    await browser.newContext(devices["iPhone 13"])
  ).newPage();
  await autre.goto(`/salon/play?code=${code}`);
  await autre.getByPlaceholder("Ex. : Julie").fill("Julie");
  await autre.getByRole("button", { name: "Rejoindre", exact: true }).click();
  await autre
    .getByRole("button", { name: "Demander ma place à l'hôte" })
    .click();
  await expect(autre.getByText("L'hôte doit confirmer")).toBeVisible();
  await regie.getByRole("button", { name: "Rendre sa place" }).click();
  await expect(autre.getByPlaceholder("Ex. : Julie")).toBeHidden();
  await expect(tel.getByText("Ta place a été reprise")).toBeVisible();
});

test("QCM : tap pendant une coupure jamais verrouillé à tort, réponse comptée au retour", async ({
  browser,
  request,
}) => {
  const jeton = await jetonDeTest();
  const res = await request.post("/api/salon", {
    headers: { authorization: `Bearer ${jeton}` },
    data: {
      playlistIds: [PLAYLIST],
      settings: { answerMode: "multiple", maxRounds: 5, roundDuration: 60 },
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const { code, key } = await res.json();

  const tv = await (
    await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  ).newPage();
  await tv.goto(`/salon/host?code=${code}&key=${key}`);
  const regie = await (await browser.newContext()).newPage();
  await regie.goto(`/salon/regie?code=${code}&key=${key}`);

  const ctx = await browser.newContext(devices["iPhone 13"]);
  const tel = await ctx.newPage();
  await tel.goto(`/salon/play?code=${code}`);
  await tel.getByPlaceholder("Ex. : Julie").fill("Julie");
  await tel.getByRole("button", { name: "Rejoindre", exact: true }).click();
  await expect(tel.getByPlaceholder("Ex. : Julie")).toBeHidden();
  await regie
    .getByRole("button", { name: "Lancer la partie", exact: true })
    .click();

  const cases = tel.locator("button.sx-choice");
  const verrou = tel.getByText("Réponse verrouillée");
  await expect(cases.first()).toBeVisible({ timeout: 90_000 });

  // Hors ligne : le tap ne part pas, ou part sans accusé et la case est rendue
  await ctx.setOffline(true);
  await cases.first().click();
  await expect(tel.getByText("Pas reçu, retape")).toBeVisible({
    timeout: 5_000,
  });
  await expect(verrou).toBeHidden();
  await expect(cases.first()).toBeEnabled();
  await expect(tv.locator(".sh-answered")).toContainText("0 / 1");

  // Retour du réseau : la manche est à jour tout de suite, la réponse compte
  await ctx.setOffline(false);
  await expect(tel.getByText("Connexion perdue")).toBeHidden({
    timeout: 2_000,
  });
  await expect(tel.getByText("Manche 1 / 5")).toBeVisible();
  await expect(async () => {
    await cases.nth(1).click({ timeout: 500 });
    await expect(verrou).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 2_000 });
  await expect(tv.locator(".sh-answered")).toContainText("1 / 1");
});
