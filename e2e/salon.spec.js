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
  // Écran privé « Prépare la TV » d'abord, puis le code pour tout le monde
  await tv.getByRole("button", { name: "Afficher le code" }).click();
  await expect(tv.locator(".lb-code")).toHaveAttribute(
    "aria-label",
    `Code ${code}`,
  );

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
    // Code venu de l'URL (QR de la TV) : affiché en tuiles, seul le pseudo reste
    await expect(tel.locator(".sp-tuiles")).toHaveAttribute(
      "aria-label",
      `Code ${code}`,
    );
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

    if (m === 1) {
      // TV allégée : réglages cachés sans geste, revenus en bougeant la souris
      // au-dessus de la vidéo ; la régie ouverte est annoncée
      await expect(tv.locator(".sh-regie-ok")).toHaveText("Régie connectée");
      await expect(tv.locator(".sh-top.calm")).toBeAttached({
        timeout: 10_000,
      });
      await tv.screenshot({ path: "test-results/tv-calme.png" });
      await tv.mouse.move(700, 500);
      await tv.mouse.move(720, 520);
      await expect(tv.locator(".sh-top.calm")).toHaveCount(0);
      await tv.screenshot({ path: "test-results/tv-reglages.png" });
    }

    if (m === 2) await telephones[1].setOffline(true);

    await regie.getByRole("button", { name: "Afficher la réponse" }).click();
    const titreRegie = regie.locator(".ra-id b");
    await expect(titreRegie).not.toHaveAttribute(
      "aria-label",
      "Réponse masquée",
    );
    if (m === 1) {
      // La reconnexion renvoie le même titre : la réponse dévoilée le reste
      await regie.context().setOffline(true);
      await expect(regie.getByText("Connexion perdue.")).toBeVisible();
      let rejoint = null;
      const surWs = (ws) => {
        rejoint = ws.waitForEvent("framereceived", {
          predicate: (f) => String(f.payload).includes("salon_control_joined"),
          timeout: 30_000,
        });
      };
      regie.on("websocket", surWs);
      await regie.context().setOffline(false);
      await expect(regie.getByText("Connexion perdue.")).toBeHidden();
      regie.off("websocket", surWs);
      // Serveur local (branche chore/e2e-*) : le mode hors ligne ne coupe pas un
      // WebSocket vers localhost, aucune nouvelle connexion n'est ouverte
      if (rejoint) await rejoint;
      // La trame est vue par Playwright avant que la page la traite
      await regie.waitForTimeout(1000);
      await expect(titreRegie).not.toHaveAttribute(
        "aria-label",
        "Réponse masquée",
      );
    }
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

  await expect(tv.getByRole("region", { name: "Fin de partie" })).toBeVisible({
    timeout: MANCHE_MAX_MS,
  });
  // Entre deux parties, QR et code pour ceux qui arrivent ou reviennent
  await expect(tv.locator(".fin .bd .qr svg")).toBeVisible();
  await expect(tv.locator(".fin .code")).toHaveAttribute(
    "aria-label",
    `Code ${code}`,
  );
  for (const nom of NOMS)
    await expect(
      tv.locator(".pz .nom").filter({ hasText: nom }),
    ).toBeAttached();
  for (const tel of [alice, bob, chloe])
    await expect(tel.getByText("Partie terminée")).toBeVisible();
  await expect(alice.getByText("Tu gagnes !")).toBeVisible();

  // Fin de partie : « Une autre ! », QR en grand, puis la partie suivante
  await bob.getByRole("button", { name: "Une autre !" }).click();
  await expect(tv.getByText("1 sur 3 en redemandent")).toBeVisible();
  await tv.screenshot({ path: "test-results/tv-fin.png" });
  await regie.getByRole("button", { name: "Afficher le QR en grand" }).click();
  const qrGrand = tv.getByRole("region", { name: "Rejoindre la partie" });
  await expect(qrGrand).toContainText("Scannez");
  await expect(qrGrand).toContainText("pour jouer");
  await regie
    .getByRole("button", { name: "Lancer la partie suivante" })
    .click();
  await expect(qrGrand).toHaveCount(0);
  for (const tel of [alice, bob, chloe])
    await expect(tel.getByText("On remet ça.").first()).toBeVisible();
});
