// /salon : états de la création (chargement en échec, réseau coupé à l'ouverture)
import { test, expect } from "@playwright/test";

test("playlists en échec : message et Réessayer qui recharge", async ({
  page,
}) => {
  await page.route("**/rest/v1/**", (r) => r.abort());
  await page.goto("/salon");
  await expect(page.getByRole("alert")).toContainText(
    "Les playlists n'ont pas pu être chargées",
  );
  await page.unroute("**/rest/v1/**");
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Ouvrir l'écran TV" }),
  ).toBeEnabled();
});

test("réseau coupé à l'ouverture : message en français, bouton réactivé", async ({
  page,
}) => {
  await page.goto("/salon");
  const go = page.getByRole("button", { name: "Ouvrir l'écran TV" });
  await expect(go).toBeEnabled();
  await page.route("**/api/salon", (r) => r.abort());
  await go.click();
  await expect(page.getByRole("alert")).toHaveText(
    "La connexion a coupé. Réessayez.",
  );
  await expect(go).toBeEnabled();
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
  // Playlist disparue : la playlist par défaut est cochée ; manches reprises
  await expect(page.locator(".st-recap")).toContainText("1 playlist");
  await expect(page.locator(".st-recap")).toContainText("15 manches");
});
