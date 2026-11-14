// / : aiguillage entre le jeu en ligne et ZIK Soirée
import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`/ aiguille en ${width} px, sans tutoriel ni débordement`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(1500);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator('.door a[href="/jouer"]')).toBeVisible();
    await expect(page.locator('.door a[href="/salon"]')).toBeVisible();
    await expect(page.locator('.door a[href="/soiree"]')).toBeVisible();
    const debord = await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    );
    expect(debord).toBeLessThanOrEqual(0);
  });
}

test("un code trop court ne part pas, un code de soirée ouvre /salon/play", async ({
  page,
}) => {
  await page.goto("/");
  const champ = page.getByLabel("J'ai un code");
  await champ.fill("abc");
  await champ.press("Enter");
  await expect(page.getByText("Le code fait 6 caractères")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await champ.fill("zz9zz9");
  await champ.press("Enter");
  await expect(page).toHaveURL(/\/salon\/play\?code=ZZ9ZZ9/);
  await expect(page.locator("#sp-username")).toBeFocused();
});

test("la porte soirée mène à la création, sans tutoriel côté soirée", async ({
  page,
}) => {
  await page.goto("/");
  // Le lien étiré de la carte recouvre le texte : un clic n'importe où ouvre la création
  await page.locator(".door-soiree .door-txt").click({ force: true });
  await expect(page).toHaveURL(/\/salon$/);
  await page.goto("/pro");
  await page.waitForTimeout(1500);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
