import "dotenv/config";

export function load({ setHeaders }) {
  setHeaders({
    "Permissions-Policy": "mediasession=(self)",
  });
  // Le layout reset (+layout@) court-circuite (site)/+layout.server.js :
  // les env vars Supabase doivent être fournies ici pour la page game.
  return {
    env: {
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    },
  };
}
