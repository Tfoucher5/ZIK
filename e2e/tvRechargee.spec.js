// Signalement du 19/11 : une TV rechargée en pleine manche restait muette
// jusqu'à la manche suivante. Elle doit recevoir et charger le titre en cours.
import { test, expect, devices } from "@playwright/test";
import { jetonDeTest, PLAYLIST } from "../scripts/charge-salon-outils.mjs";

const MANCHE_MAX_MS = 90_000;

test("TV rechargée en pleine manche : la musique en cours repart", async ({
  browser,
  request,
}) => {
  const jeton = await jetonDeTest();
  const res = await request.post("/api/salon", {
    headers: { authorization: `Bearer ${jeton}` },
    data: {
      playlistIds: [PLAYLIST],
      settings: { answerMode: "free", maxRounds: 5, roundDuration: 30 },
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const { code, key } = await res.json();

  // Messages reçus par la TV : on garde le dernier salon_host_joined
  const ecran = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  let rejointe = null;
  await ecran.routeWebSocket(/socket\.io/, (ws) => {
    const serveur = ws.connectToServer();
    serveur.onMessage((m) => {
      if (typeof m === "string" && m.startsWith('42["salon_host_joined"'))
        rejointe = JSON.parse(m.slice(2))[1];
      ws.send(m);
    });
    ws.onMessage((m) => serveur.send(m));
  });
  const tv = await ecran.newPage();
  await tv.goto(`/salon/host?code=${code}&key=${key}`);
  await tv.getByRole("button", { name: "Afficher le code" }).click();

  const regie = await (await browser.newContext()).newPage();
  await regie.goto(`/salon/regie?code=${code}&key=${key}`);
  const tel = await (await browser.newContext(devices["iPhone 13"])).newPage();
  await tel.goto(`/salon/play?code=${code}`);
  await expect(tel.locator(".sp-tuiles")).toBeVisible();
  await tel.getByPlaceholder("Ex. : Julie").fill("Alice");
  await tel.getByRole("button", { name: "Rejoindre", exact: true }).click();

  await regie
    .getByRole("button", { name: "Lancer la partie", exact: true })
    .click();
  // Manche en cours sur la TV (chrono lancé)
  await expect(tv.locator(".sh-timer")).toBeVisible({ timeout: MANCHE_MAX_MS });

  rejointe = null;
  await tv.reload();
  await expect.poll(() => rejointe?.phase, { timeout: 30_000 }).toBe("round");
  const media = rejointe.media;
  expect(media, "la TV rechargée reçoit le titre en cours").toBeTruthy();
  if (media.videoId) {
    // Le lecteur YouTube est créé avec la vidéo de la manche
    await expect(
      tv.locator(`iframe[src*="${media.videoId}"]`).first(),
    ).toBeAttached({ timeout: 20_000 });
    expect(media.startSeconds).toBeGreaterThanOrEqual(0);
  } else expect(media.audioUrl).toMatch(/^https?:/);
  // Le téléphone n'a rien reçu de tout ça : pas de média côté joueur
  await expect(tel.locator("iframe[src*=youtube]")).toHaveCount(0);
});
