// Soirée gratuite complète sur le staging : 12 joueurs (sockets), le 13e
// téléphone attend à l'entrée, la régie et la TV le voient, puis il entre
// dès que l'hôte retire un joueur.
import { test, expect, devices } from "@playwright/test";
import { io } from "socket.io-client";
import { PLAYLIST } from "../scripts/charge-salon-outils.mjs";

const PLEINS = 12;

test("13e joueur en file, entre quand une place se libère", async ({
  browser,
  request,
  baseURL,
}) => {
  // Sans compte : salon gratuit, limité à 12
  const res = await request.post("/api/salon", {
    data: { playlistIds: [PLAYLIST], settings: { answerMode: "free" } },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const { code, key } = await res.json();

  const tv = await (
    await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  ).newPage();
  await tv.goto(`/salon/host?code=${code}&key=${key}`);
  await tv.getByRole("button", { name: "Afficher le code" }).click();

  const regie = await (await browser.newContext()).newPage();
  await regie.goto(`/salon/regie?code=${code}&key=${key}`);

  const sockets = [];
  const connecter = (evt, data, attendu) =>
    new Promise((ok, ko) => {
      const s = io(baseURL, { transports: ["websocket"], forceNew: true });
      sockets.push(s);
      s.once(attendu, () => ok(s));
      s.once("salon_error", (e) => ko(new Error(e.message)));
      s.once("connect", () => s.emit(evt, data));
    });
  try {
    for (let i = 1; i <= PLEINS; i++)
      await connecter(
        "salon_join_player",
        { code, username: `J${i}` },
        "salon_joined",
      );
    await expect(tv.locator(".lb-cpt b")).toHaveText(String(PLEINS));

    const tel = await (
      await browser.newContext(devices["iPhone 13"])
    ).newPage();
    await tel.goto(`/salon/play?code=${code}`);
    // Tuiles posées au montage : page hydratée, le clic n'est plus perdu
    await expect(tel.locator(".sp-tuiles")).toBeVisible();
    await tel.getByPlaceholder("Ex. : Julie").fill("Zoé");
    await tel.getByRole("button", { name: "Rejoindre", exact: true }).click();
    await expect(
      tel.getByRole("heading", { name: "Tu entres si une place se libère." }),
    ).toBeVisible();

    await expect(regie.locator(".ro-places i.att")).toHaveText("Z");
    await expect(regie.getByText("Fais entrer Zoé")).toBeVisible();
    await expect(tv.getByText("1 en attente")).toBeVisible();
    await regie.screenshot({ path: "test-results/regie-file.png" });

    const ctrl = await connecter(
      "salon_join_control",
      { code, key },
      "salon_control_joined",
    );
    ctrl.emit("salon_kick", { username: "J1" });

    await expect(
      tel.getByText("Une place s'est libérée. Tu es dedans, Zoé."),
    ).toBeVisible();
    await expect(tv.getByText("1 en attente")).toHaveCount(0);
    await expect(tv.locator(".lb-cpt b")).toHaveText(String(PLEINS));
  } finally {
    for (const s of sockets) s.disconnect();
  }
});
