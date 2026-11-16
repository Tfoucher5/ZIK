// /soiree : vitrine ZIK Soirée pour organisateurs
import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`/soiree tient en ${width} px et mène à la création d'un salon`, async ({
    page,
  }) => {
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/soiree");
    // Premier passage : le tutoriel du jeu ne s'ouvre pas sur la vitrine
    await page.waitForTimeout(1500);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Le blind test qui fait la soirée",
    );
    await expect(
      page.getByRole("link", { name: "Créer une soirée" }).first(),
    ).toHaveAttribute("href", "/salon");
    // Les sections épinglées défilent jusqu'au bout sans casser la page
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.locator("#fin h2").scrollIntoViewIfNeeded();
    await expect(page.locator("#fin h2")).toBeInViewport();
    const debord = await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    );
    expect(debord).toBeLessThanOrEqual(0);
    // Pas de grand vide : les 4 choix remplissent l'écran du téléphone, et
    // les offres suivent le matériel de près
    const vides = await page.evaluate(() => {
      const box = (s) => document.querySelector(s).getBoundingClientRect();
      return {
        choix: box("#reponses .qc").height / box("#reponses .phs").height,
        offres:
          box("#offres .label").top - box("#materiel li:last-child").bottom,
      };
    });
    expect(vides.choix).toBeGreaterThan(0.5);
    expect(vides.offres).toBeLessThan(200);
    expect(erreurs).toEqual([]);
  });
}

// L'épinglage allonge la page après le premier rendu : l'ancre et le retour
// arrière doivent quand même retomber au bon endroit
for (const ancre of ["faq", "offres"]) {
  test(`/soiree#${ancre} en première visite arrive sur la section`, async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(`/soiree#${ancre}`);
    await expect(page.locator(".pin-spacer").first()).toBeAttached();
    await expect(page.locator(`#${ancre} h2`)).toBeInViewport();
    await ctx.close();
  });
}

test("/soiree : retour arrière depuis une autre page, même position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/soiree");
  await expect(page.locator(".pin-spacer").first()).toBeAttached();
  await page.locator("#offres h2").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const y = await page.evaluate(() => scrollY);
  expect(y).toBeGreaterThan(1000);
  await page.locator('header.top a[href="/jouer"]').click();
  await page.waitForURL("**/jouer");
  await page.goBack();
  await page.waitForURL("**/soiree");
  await expect(page.locator(".pin-spacer").first()).toBeAttached();
  await expect
    .poll(() => page.evaluate(() => scrollY), { timeout: 10_000 })
    .toBeGreaterThan(y - 50);
  expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(50);
  await expect(page.locator("#offres h2")).toBeInViewport();
});

test("/soiree en mouvements réduits : sections dépliées, phrases lisibles", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/soiree");
  await expect(page.locator("html")).toHaveClass(/\brm\b/);
  await expect(
    page.getByText("Les points tombent et le classement se réordonne"),
  ).toBeVisible();
  await expect(page.getByText("Pour l'animateur")).toBeVisible();
});
