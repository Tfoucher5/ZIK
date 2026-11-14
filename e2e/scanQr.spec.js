// Rejoindre une soirée en scannant le QR de la TV dans la page (caméra simulée).
import { test, expect, devices } from "@playwright/test";

test.use({
  ...devices["Pixel 7"],
  permissions: ["camera"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
});

const BOUTON = { name: "Scanner le QR code de la TV" };

// BarcodeDetector factice qui « voit » toujours ce QR ; refus : caméra refusée
function simuler(page, rawValue, { refus = false } = {}) {
  return page.addInitScript(
    ([rawValue, refus]) => {
      window.BarcodeDetector = class {
        static getSupportedFormats() {
          return Promise.resolve(["qr_code"]);
        }
        detect() {
          return Promise.resolve([{ rawValue }]);
        }
      };
      if (refus)
        navigator.mediaDevices.getUserMedia = () =>
          Promise.reject(new DOMException("refus", "NotAllowedError"));
    },
    [rawValue, refus],
  );
}

const cameraActive = (page) =>
  page.evaluate(() =>
    (document.querySelector("video")?.srcObject?.getTracks() ?? []).some(
      (t) => t.readyState === "live",
    ),
  );

test("le QR de la TV remplit le code", async ({ page }) => {
  await simuler(page, "https://www.zik-music.fr/salon/play?code=ab12cd");
  await page.goto("/salon/play");
  await page.getByRole("button", BOUTON).click();
  await expect(page.locator(".sp-code-input")).toHaveValue("AB12CD");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByPlaceholder("Ex. : Julie")).toBeFocused();
});

test("un QR étranger est signalé, la caméra continue, Annuler la coupe", async ({
  page,
}) => {
  await simuler(page, "https://exemple.fr/menu");
  await page.goto("/salon/play");
  await page.getByRole("button", BOUTON).click();
  await expect(
    page.getByText("Ce QR code n'est pas celui d'une soirée ZIK."),
  ).toBeVisible();
  expect(await cameraActive(page)).toBe(true);
  const video = await page.locator("video").elementHandle();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(
    await video.evaluate((v) =>
      v.srcObject.getTracks().every((t) => t.readyState === "ended"),
    ),
  ).toBe(true);
  await expect(page.locator(".sp-code-input")).toHaveValue("");
});

test("caméra refusée : message clair", async ({ page }) => {
  await simuler(page, "", { refus: true });
  await page.goto("/salon/play");
  await page.getByRole("button", BOUTON).click();
  await expect(page.getByText(/Caméra refusée/)).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
