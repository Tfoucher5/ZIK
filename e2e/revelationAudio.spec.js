// Manche jouée sans vidéo (extrait audio) : à la révélation, la TV montre la
// pochette, pas la vidéo de la manche d'avant restée en pause.
import { test, expect, devices } from "@playwright/test";
import { jetonDeTest, PLAYLIST } from "../scripts/charge-salon-outils.mjs";

const MANCHE_MAX_MS = 90_000;

test("révélation d'une manche sans vidéo", async ({ browser, request }) => {
  const jeton = await jetonDeTest();
  const res = await request.post("/api/salon", {
    headers: { authorization: `Bearer ${jeton}` },
    data: {
      playlistIds: [PLAYLIST],
      settings: {
        answerMode: "free",
        maxRounds: 5,
        roundDuration: 15,
        manualNext: true,
      },
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const { code, key } = await res.json();

  const ecran = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  // La 2e manche arrive sur la TV sans vidéo, avec un extrait audio
  let manches = 0;
  await ecran.routeWebSocket(/socket\.io/, (ws) => {
    const serveur = ws.connectToServer();
    serveur.onMessage((m) => {
      if (
        typeof m === "string" &&
        m.startsWith('42["salon_round_start"') &&
        ++manches === 2
      ) {
        const [ev, d] = JSON.parse(m.slice(2));
        delete d.videoId;
        d.audioUrl = "https://example.invalid/extrait.mp3";
        return ws.send("42" + JSON.stringify([ev, d]));
      }
      ws.send(m);
    });
    ws.onMessage((m) => serveur.send(m));
  });
  const tv = await ecran.newPage();
  await tv.goto(`/salon/host?code=${code}&key=${key}`);
  await expect(tv.locator(".sh-join-code")).toHaveText(code);

  const regie = await (await browser.newContext()).newPage();
  await regie.goto(`/salon/regie?code=${code}&key=${key}`);
  const tel = await (await browser.newContext(devices["iPhone 13"])).newPage();
  await tel.goto(`/salon/play?code=${code}`);
  await tel.locator(".sp-code-input").fill(code);
  await tel.getByPlaceholder("Ex. : Julie").fill("Alice");
  await tel.getByRole("button", { name: "Rejoindre", exact: true }).click();
  await expect(tel.getByPlaceholder("Ex. : Julie")).toBeHidden();

  await regie
    .getByRole("button", { name: "Lancer la partie", exact: true })
    .click();
  const reveler = regie.getByRole("button", { name: "Afficher la réponse" });

  // Manche 1, avec vidéo : rien ne la cache à la révélation
  await expect(reveler).toBeVisible({ timeout: MANCHE_MAX_MS });
  await reveler.click();
  await expect(tv.locator(".sh-reveal")).toBeVisible();
  await expect(tv.locator(".ar")).toHaveCount(0);

  // Manche 2, sans vidéo : la pochette prend la place
  await regie.getByRole("button", { name: "Manche suivante" }).click();
  await expect(tv.locator(".sh-reveal")).toBeHidden({
    timeout: MANCHE_MAX_MS,
  });
  await expect(reveler).toBeVisible({ timeout: MANCHE_MAX_MS });
  await reveler.click();
  await expect(tv.locator(".ar")).toBeVisible();
});
