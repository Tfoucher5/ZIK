import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import dotenv from "dotenv";

dotenv.config();

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

export const FROM_EMAIL = "theo@zik-music.fr";

export const db = () =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_KEY"), {
    auth: { persistSession: false },
  });

// Boîte IONOS de theo@zik-music.fr : envoi SMTP, lecture et copie en IMAP
export const smtp = () =>
  nodemailer.createTransport({
    host: "smtp.ionos.fr",
    port: 465,
    secure: true,
    auth: { user: FROM_EMAIL, pass: env("PROSPECT_MAIL_PASSWORD") },
  });

export async function imap() {
  const client = new ImapFlow({
    host: "imap.ionos.fr",
    port: 993,
    secure: true,
    auth: { user: FROM_EMAIL, pass: env("PROSPECT_MAIL_PASSWORD") },
    logger: false,
  });
  await client.connect();
  return client;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
