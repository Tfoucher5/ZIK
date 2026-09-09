import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.js"],
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
