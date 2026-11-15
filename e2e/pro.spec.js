// /pro : offres ZIK Pro et page de retour du paiement (sans compte, sans payer)
import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`/pro tient en ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pro");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Le blind test qui fait la soirée",
    );
    await page.waitForTimeout(1500);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const debord = await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    );
    expect(debord).toBeLessThanOrEqual(0);
  });
}

test("le filtre des offres montre une soirée ou les lieux", async ({
  page,
}) => {
  // Attendre l'hydratation : un clic avant est perdu
  await page.goto("/pro", { waitUntil: "networkidle" });
  const offres = page.locator("#tarifs article");
  await expect(offres).toHaveCount(3);
  await page.getByRole("button", { name: "Pour une soirée" }).click();
  await expect(offres).toHaveCount(1);
  await expect(offres).toContainText("Soirée 24 h");
  await page.getByRole("button", { name: "Pour les lieux" }).click();
  await expect(offres).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Pour les lieux" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Tout voir" }).click();
  await expect(offres).toHaveCount(3);
});

test("une formule choisie sans compte ouvre la connexion", async ({ page }) => {
  await page.goto("/pro", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Prendre la Soirée 24 h" }).click();
  await expect(page.getByRole("dialog", { name: "Connexion" })).toBeVisible();
  const intent = await page.evaluate(() =>
    sessionStorage.getItem("zik_pro_intent"),
  );
  expect(intent).toBe("night");
});

test("le retour du paiement sans compte demande de se connecter", async ({
  page,
}) => {
  await page.goto("/pro/merci?session_id=cs_test_x", {
    waitUntil: "networkidle",
  });
  await expect(page.getByRole("status")).toContainText("Connexion nécessaire");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page.getByRole("dialog", { name: "Connexion" })).toBeVisible();
});
