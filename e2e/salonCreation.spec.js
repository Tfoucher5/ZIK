// /salon : états de la création (chargement en échec, réseau coupé à la création)
import { test, expect } from "@playwright/test";

const creer = (page) => page.getByRole("button", { name: "Créer la soirée" });

test("playlists en échec : un seul essai, message et Réessayer qui recharge", async ({
  page,
}) => {
  let essais = 0;
  await page.route("**/rest/v1/custom_playlists*", (r) => {
    essais++;
    return r.abort();
  });
  await page.goto("/salon");
  await expect(page.getByRole("alert")).toContainText(
    "Les playlists n'ont pas pu être chargées",
  );
  // L'échec ne relance pas le chargement tout seul (il bouclait sans fin).
  // Un chargement = une requête et au plus 3 reprises de supabase-js.
  const apresEchec = essais;
  await page.waitForTimeout(1500);
  expect(essais).toBe(apresEchec);
  expect(essais).toBeLessThanOrEqual(4);
  await page.unroute("**/rest/v1/custom_playlists*");
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".pp-sleeve").first()).toBeVisible();
});

test("aucune playlist cochée d'office : bouton désactivé tant que rien n'est choisi", async ({
  page,
}) => {
  await page.goto("/salon");
  await expect(page.locator(".pp-sleeve").first()).toBeVisible();
  await expect(page.getByText("Choisis au moins une playlist")).toBeVisible();
  await expect(creer(page)).toBeDisabled();
  await page.locator(".pp-sleeve").first().click();
  await expect(creer(page)).toBeEnabled();
});

test("réseau coupé à la création : message en français, bouton réactivé", async ({
  page,
}) => {
  await page.goto("/salon");
  await page.locator(".pp-sleeve").first().click();
  await page.route("**/api/salon", (r) => r.abort());
  await creer(page).click();
  await expect(page.getByRole("alert")).toHaveText(
    "La connexion a coupé. Réessaie.",
  );
  await expect(creer(page)).toBeEnabled();
});

test("la création retient la dernière préparation", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "zik_salon_setup",
      JSON.stringify({
        playlistIds: ["inconnue"],
        settings: { maxRounds: 15 },
      }),
    ),
  );
  await page.goto("/salon");
  await expect(page.locator(".pp-sleeve").first()).toBeVisible();
  // Playlist disparue : rien n'est coché ; manches reprises
  await expect(page.getByText("Choisis au moins une playlist")).toBeVisible();
  await expect(
    page
      .getByRole("radiogroup", { name: "Nombre de manches" })
      .getByRole("radio", { name: "15" }),
  ).toHaveAttribute("aria-checked", "true");
});
