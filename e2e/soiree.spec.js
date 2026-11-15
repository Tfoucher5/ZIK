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
    expect(erreurs).toEqual([]);
  });
}

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
