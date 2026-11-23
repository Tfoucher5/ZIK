import "dotenv/config";
import { joinParams } from "$lib/components/salon/play/resume.js";

/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
  return {
    join: joinParams(url.search),
    env: {
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    },
  };
}
