import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
import {
  assertCibleAutorisee,
  DEV_URL,
} from "./scripts/charge-salon-outils.mjs";

config({ quiet: true });

// Staging ou local seulement, jamais la prod (même garde-fou que le test de charge)
const baseURL = assertCibleAutorisee(
  process.env.E2E_URL ?? DEV_URL,
  process.env.SUPABASE_URL ?? "",
);

export default defineConfig({
  testDir: "e2e",
  timeout: 8 * 60 * 1000,
  expect: { timeout: 30_000 },
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
});
