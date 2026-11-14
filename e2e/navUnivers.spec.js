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

test("la soirée n'a ni rooms, ni Zikle, ni cartes", async ({ page }) => {
  await page.goto("/soiree");
  for (const href of ["/rooms", "/zikle", "/cartes"])
    await expect(page.locator(`#navbar a[href="${href}"]`)).toHaveCount(0);
  await expect(page.locator("#navbar .nav-create")).toHaveAttribute(
    "href",
    "/salon",
  );
  await expect(page.locator("#navbar .nav-switch")).toHaveAttribute(
    "href",
    "/jouer",
  );
});

test("en 390 px, chaque univers a sa barre du bas, l'aiguillage aucune", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#bottom-nav")).toHaveCount(0);
  await page.goto("/jouer");
  await expect(page.locator('#bottom-nav a[href="/jouer"]')).toBeVisible();
  await page.goto("/soiree");
  await expect(page.locator('#bottom-nav a[href="/salon"]')).toBeVisible();
  await expect(page.locator('#bottom-nav a[href="/rooms"]')).toHaveCount(0);
});
