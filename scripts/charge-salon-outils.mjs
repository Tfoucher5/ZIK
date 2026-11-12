import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

export const DEV_URL = "https://zik-dev-dev-developpement.up.railway.app";
const STAGING_REF = "ieuknbblonybkiqknonn";
export const PLAYLIST = "6e9ccdc8-1257-4977-8ad3-9e4db3691cdd";
const COMPTE = "charge-test@zik-music.invalid";
const LIMITE_MS = 1000;
const GENERATEUR_MAX_MS = 200;
const OPTIONS = ["url", "joueurs", "salons", "manches", "rythme", "deflate"];

// Renvoie l'origine vérifiée : seule valeur à utiliser ensuite. Socket.io ne lit
// pas une URL comme fetch, une adresse brute pourrait viser un autre hôte
export function assertCibleAutorisee(url, supabaseUrl) {
  const { origin, hostname } = new URL(url);
  if (origin !== DEV_URL && hostname !== "localhost")
    throw new Error(`Cible refusée : ${origin}. Staging ou local seulement.`);
  if (new URL(supabaseUrl).hostname !== `${STAGING_REF}.supabase.co`)
    throw new Error("Le .env ne pointe pas sur la base de staging.");
  return origin;
}

// Liste vide : aucune mesure, donc rien de prouvé. percentile vaut null, et
// null <= 1000 serait vrai
function latenceTenue(nom, valeurs, motifs) {
  if (!valeurs.length) motifs.push(`${nom} : aucune mesure`);
  else if (percentile(valeurs, 95) > LIMITE_MS)
    motifs.push(`${nom} : p95 au-dessus de ${LIMITE_MS} ms`);
}

export function verdict(m, opts) {
  const motifs = [];
  const attendus = opts.joueurs;
  if (m.rejoints.length !== attendus)
    motifs.push(`joueurs entrés : ${m.rejoints.length}/${attendus}`);
  if (m.podiums.length !== opts.salons)
    motifs.push(`podiums : ${m.podiums.length}/${opts.salons}`);
  // Une partie finie trop tôt est le symptôme de l'incident du 30/10
  for (const p of m.podiums) {
    if (p.rounds !== opts.manches)
      motifs.push(`salon ${p.code} : ${p.rounds}/${opts.manches} manches`);
    if (!(p.points > 0)) motifs.push(`salon ${p.code} : aucun point marqué`);
  }
  const classes = m.podiums.reduce((n, p) => n + p.classes, 0);
  if (classes !== attendus)
    motifs.push(`joueurs classés : ${classes}/${attendus}`);
  if (m.finis !== attendus) motifs.push(`fins reçues : ${m.finis}/${attendus}`);
  if (m.coupures.length) motifs.push(`coupures : ${m.coupures.length}`);
  if (m.erreurs.length) motifs.push(`erreurs : ${m.erreurs.length}`);
  if (m.reponses.length < m.envoyes)
    motifs.push(`essais sans réponse : ${m.envoyes - m.reponses.length}`);
  latenceTenue("début de manche", m.diffusion, motifs);
  latenceTenue("réponse à un essai", m.reponses, motifs);
  if (m.lagMs > GENERATEUR_MAX_MS)
    motifs.push(`générateur saturé (${m.lagMs} ms) : mesures non concluantes`);
  return motifs;
}

export function percentile(valeurs, p) {
  if (!valeurs.length) return null;
  const tries = [...valeurs].sort((a, b) => a - b);
  return tries[
    Math.min(tries.length - 1, Math.ceil((p / 100) * tries.length) - 1)
  ];
}

export function lireArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--") || argv[i + 1] === undefined)
      throw new Error(`Argument invalide : ${argv[i]}`);
    if (!OPTIONS.includes(argv[i].slice(2)))
      throw new Error(`Option inconnue : ${argv[i]}`);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  const entier = (nom, defaut, min, max) => {
    const n = Number(args[nom] ?? defaut);
    if (!Number.isInteger(n) || n < min || n > max)
      throw new Error(`--${nom} doit être un entier de ${min} à ${max}`);
    return n;
  };
  if (!["oui", "non"].includes(args.deflate ?? "oui"))
    throw new Error("--deflate doit valoir oui ou non");
  return {
    url: args.url ?? DEV_URL,
    joueurs: entier("joueurs", 250, 1, 5000),
    salons: entier("salons", 1, 1, 20),
    manches: entier("manches", 5, 5, 20),
    rythme: entier("rythme", 50, 1, 500),
    deflate: args.deflate !== "non",
  };
}

export async function jetonDeTest() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY } = process.env;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const password = randomBytes(24).toString("base64url");
  const { data: liste, error: e1 } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (e1) throw e1;
  let user = liste.users.find((u) => u.email === COMPTE);
  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
    });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: COMPTE,
      password,
      email_confirm: true,
      user_metadata: { username: "charge-test" },
    });
    if (error) throw error;
    user = data.user;
  }
  const { error: e2 } = await admin
    .schema("salon")
    .from("pro_subscriptions")
    .upsert({
      user_id: user.id,
      plan: "monthly",
      status: "active",
      current_period_end: new Date(Date.now() + 3600_000).toISOString(),
    });
  if (e2) throw e2;
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({
    email: COMPTE,
    password,
  });
  if (error) throw error;
  return data.session.access_token;
}
