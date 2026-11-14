// /jouer : entrée du jeu en ligne, sans rien de la soirée hors navigation
import { test, expect } from "@playwright/test";

test("/jouer ne propose pas d'organiser une soirée", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("zik_onboarding_done", "1"),
  );
  await page.goto("/jouer");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "PROUVE-LE",
  );
  await expect(page.locator('section a[href="/salon"]')).toHaveCount(0);
  await expect(page.locator(".hero-salon")).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://www.zik-music.fr/jouer",
  );
});
