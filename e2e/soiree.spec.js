// /soiree : vitrine ZIK Soirée pour organisateurs
import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`/soiree tient en ${width} px et mène à la création d'un salon`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/soiree");
    // Premier passage : le tutoriel du jeu ne s'ouvre pas sur la vitrine
    await page.waitForTimeout(1500);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "La TV diffuse",
    );
    await expect(
      page.getByRole("link", { name: "Lancer une soirée" }).first(),
    ).toHaveAttribute("href", "/salon");
    const debord = await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    );
    expect(debord).toBeLessThanOrEqual(0);
  });
}
