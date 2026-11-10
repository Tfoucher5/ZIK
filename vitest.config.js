import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Compile les runes des classes d'état (.svelte.js) pour pouvoir les tester
  plugins: [svelte()],
  // Pour importer les routes (+server.js) dans les tests ; le code de src/lib
  // garde ses imports relatifs (server.js le charge avec Node pur)
  resolve: {
    alias: { $lib: fileURLToPath(new URL("src/lib", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.js"],
    // Seuils 1 point sous le mesuré du 10/11 : on les monte, on ne les baisse jamais
    coverage: {
      include: ["src/lib/server/socket/**", "src/lib/server/services/**"],
      exclude: ["**/__tests__/**"],
      // json-summary : lu par scripts/couverture.mjs (badge et commentaire de PR)
      reporter: ["text-summary", "json-summary"],
      thresholds: { statements: 89, branches: 82, functions: 88, lines: 91 },
    },
    // `src/lib/server/config.js` crée son client Supabase au chargement du
    // module et lève si l'URL manque. Importer n'importe quel service côté
    // serveur ferait donc échouer la suite là où il n'y a pas de .env : en CI,
    // ou sur un dépôt fraîchement cloné.
    //
    // Ces valeurs ne sont jamais appelées — les tests ne couvrent que des
    // fonctions pures — et dotenv ne remplace pas une variable déjà définie,
    // ce qui garantit au passage qu'une suite de tests ne peut pas taper sur
    // la vraie base.
    env: {
      SUPABASE_URL: "http://localhost:54321",
      SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
