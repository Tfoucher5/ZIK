// / : l'immeuble, la porte du bar (ZIK Soirée) et les étages (jeu en ligne)
import { test, expect } from "@playwright/test";

const LIENS = ["/salon", "/jouer", "/soiree", "/pro", "/zikle", "/rooms"];

for (const [width, height] of [
  [1440, 900],
  [390, 844],
]) {
  test(`/ en ${width} px : un h1, liens clés, sans tutoriel ni débordement`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.waitForTimeout(1500);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Le blind test",
    );
    for (const href of LIENS)
      expect(
        await page.locator(`main a[href="${href}"]`).count(),
        href,
      ).toBeGreaterThan(0);
    for (const y of [0, 0.3, 0.6, 1]) {
      await page.evaluate(
        (f) => scrollTo(0, f * document.documentElement.scrollHeight),
        y,
      );
      const debord = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      expect(debord).toBeLessThanOrEqual(0);
    }
  });
}

test("le digicode : un code trop court ne part pas, un code de soirée ouvre /salon/play", async ({
  page,
}) => {
  await page.goto("/");
  // Le digicode ne s'ouvre qu'une fois la page hydratée
  await page.waitForTimeout(1500);
  await page
    .getByRole("button", { name: "J'ai un code : saisir les 6 caractères" })
    .click();
  const champ = page.getByRole("textbox", { name: "J'ai un code" });
  await expect(champ).toBeFocused();
  await champ.fill("abc");
  await champ.press("Enter");
  await expect(page.getByText("Le code fait 6 caractères")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await champ.fill("zz9zz9");
  await champ.press("Enter");
  await expect(page).toHaveURL(/\/salon\/play\?code=ZZ9ZZ9/);
});

test("« J'ai un code » de la setlist ouvre le même digicode", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.locator('main a.trk[href="/salon/play"]').click();
  await expect(
    page.getByRole("textbox", { name: "J'ai un code" }),
  ).toBeFocused();
  await expect(page).toHaveURL(/\/$/);
});
