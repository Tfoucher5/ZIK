// Écran TV ouvert sur un téléphone : rien ne dépasse à droite, la régie reste visible.
import { test, expect } from "@playwright/test";
import { jetonDeTest, PLAYLIST } from "../scripts/charge-salon-outils.mjs";

test("TV en 390 px sans débordement", async ({ browser, request }) => {
  const jeton = await jetonDeTest();
  const res = await request.post("/api/salon", {
    headers: { authorization: `Bearer ${jeton}` },
    data: { playlistIds: [PLAYLIST], settings: {} },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const { code, key } = await res.json();

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const tv = await ctx.newPage();
  await tv.goto(`/salon/host?code=${code}&key=${key}`);
  await expect(tv.locator(".sh-join-code")).toHaveText(code);

  const depassent = await tv.evaluate(() =>
    [...document.querySelectorAll(".sh *")]
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
      .map((e) => `${e.tagName}.${e.className}`),
  );
  expect(depassent).toEqual([]);
  await expect(tv.getByRole("link", { name: "Régie" })).toBeInViewport();
  await expect(tv.locator(".sh-lobby .sx-kicker")).toBeInViewport();
  await tv.locator(".sh-qr").scrollIntoViewIfNeeded();
  await expect(tv.locator(".sh-qr")).toBeInViewport({ ratio: 1 });
  await ctx.close();
});
