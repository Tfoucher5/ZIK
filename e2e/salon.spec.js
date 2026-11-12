// Soirée complète sur le staging : une TV, une régie, trois téléphones.
// Bob passe hors ligne pendant la manche 2, jusqu'à ce que la TV le voie
// déconnecté, et doit retrouver sa place.
import { test, expect, devices } from "@playwright/test";
import { jetonDeTest, PLAYLIST } from "../scripts/charge-salon-outils.mjs";

const MANCHES = 5;
const NOMS = ["Alice", "Bob", "Chloé"];
const MANCHE_MAX_MS = 90_000;

test("soirée complète jusqu'au podium", async ({ browser, request }) => {
  const jeton = await jetonDeTest();
  const res = await request.post("/api/salon", {
    headers: { authorization: `Bearer ${jeton}` },
    data: {
      playlistIds: [PLAYLIST],
      settings: {
        answerMode: "free",
        maxRounds: MANCHES,
        roundDuration: 15,
        showAnswerDuration: 3,
      },
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const { code, key } = await res.json();

  const ecran = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const tv = await ecran.newPage();
  await tv.goto(`/salon/host?code=${code}&key=${key}`);
  await expect(tv.locator(".sh-join-code")).toHaveText(code);

  const regie = await (await browser.newContext()).newPage();
  await regie.goto(`/salon/regie?code=${code}&key=${key}`);

  const telephones = await Promise.all(
    NOMS.map(() => browser.newContext(devices["iPhone 13"])),
  );
  const [alice, bob, chloe] = await Promise.all(
    telephones.map((c) => c.newPage()),
  );
  for (const [i, tel] of [alice, bob, chloe].entries()) {
    await tel.goto(`/salon/play?code=${code}`);
    await tel.locator(".sp-code-input").fill(code);
    await tel.getByPlaceholder("Ex. : Julie").fill(NOMS[i]);
    await tel.getByRole("button", { name: "Rejoindre", exact: true }).click();
    await expect(tel.getByPlaceholder("Ex. : Julie")).toBeHidden();
  }

  await regie
    .getByRole("button", { name: "Lancer la partie", exact: true })
    .click();

  for (let m = 1; m <= MANCHES; m++) {
    const enLigne = m === 2 ? [alice, chloe] : [alice, bob, chloe];
    for (const tel of enLigne)
      await expect(tel.getByText(`Manche ${m} / ${MANCHES}`)).toBeVisible({
        timeout: MANCHE_MAX_MS,
      });

    // Le champ n'apparaît qu'une fois la musique lancée par la TV
    const champ = alice.locator("#salon-guess-input");
    await expect(champ).toBeVisible({ timeout: MANCHE_MAX_MS });

    if (m === 2) await telephones[1].setOffline(true);

    await regie.getByRole("button", { name: "Afficher la réponse" }).click();
    const titreRegie = regie.locator(".ra-id b");
    await expect(titreRegie).not.toHaveAttribute(
      "aria-label",
      "Réponse masquée",
    );
    const reponse = await titreRegie.getAttribute("aria-label");
    const titre = reponse.slice(reponse.indexOf(" - ") + 3);
    await champ.fill(titre);
    await champ.press("Enter");
    await expect(alice.locator(".sp-chip.found")).not.toHaveCount(0);

    if (m === 2) {
      const ligneBob = tv.locator(".sh-row").filter({ hasText: "Bob" });
      await expect(ligneBob).toHaveClass(/offline/, { timeout: 60_000 });
      await telephones[1].setOffline(false);
      await expect(ligneBob).not.toHaveClass(/offline/);
    }
  }

  await expect(tv.getByText(`Vainqueur · ${MANCHES} manches`)).toBeVisible({
    timeout: MANCHE_MAX_MS,
  });
  for (const nom of NOMS)
    await expect(
      tv.locator(".sh-po-name").filter({ hasText: nom }),
    ).toBeAttached();
  for (const tel of [alice, bob, chloe])
    await expect(tel.getByText("Partie terminée")).toBeVisible();
  await expect(alice.getByText("Tu gagnes !")).toBeVisible();
});
