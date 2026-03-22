import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// On force le chargement du .env si process.env est vide (cas de Vite au démarrage)
dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// Admin client (service role) — for privileged operations like auth.admin.deleteUser
// Requires SUPABASE_SERVICE_KEY in .env
export function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_KEY manquante — impossible de faire des opérations admin.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
