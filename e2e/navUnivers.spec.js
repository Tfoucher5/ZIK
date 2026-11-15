// Navigation propre à chaque univers : jeu, soirée, aiguillage
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("zik_onboarding_done", "1"),
  );
});

test("le jeu n'a que le lien discret vers la soirée", async ({ page }) => {
  await page.goto("/jouer");
  await expect(page.locator('#navbar a[href="/rooms"]')).toBeVisible();
  await expect(page.locator("#navbar .nav-switch")).toHaveAttribute(
    "href",
    "/soiree",
  );
  await expect(page.locator('#navbar a[href="/salon"]')).toHaveCount(0);
});

test("la soirée a le bandeau TV, sans rooms ni cartes", async ({ page }) => {
  await page.goto("/soiree");
  await expect(page.locator("#navbar")).toHaveCount(0);
  const band = page.locator("header.top");
  await expect(band.locator('a[href="/soiree"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const href of ["/rooms", "/cartes"])
    await expect(band.locator(`a[href="${href}"]`)).toHaveCount(0);
  await expect(
    band.getByRole("button", { name: /saisir les 6 caractères/ }),
  ).toBeVisible();
});

test("en 390 px, le jeu a sa barre du bas, l'aiguillage et la soirée (bandeau TV) aucune", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#bottom-nav")).toHaveCount(0);
  await page.goto("/jouer");
  await expect(page.locator('#bottom-nav a[href="/jouer"]')).toBeVisible();
  await page.goto("/soiree");
  await expect(page.locator("#bottom-nav")).toHaveCount(0);
});
