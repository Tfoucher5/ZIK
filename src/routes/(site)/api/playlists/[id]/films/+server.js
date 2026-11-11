import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { requireAuth, checkRateLimit } from "$lib/server/middleware/auth.js";
import {
  WORK_TYPE_IDS,
  canEditPlaylist,
  saveWorks,
  suggestWorks,
} from "$lib/server/services/music/workSuggest.js";

const TYPE_IDS = new Set(Object.values(WORK_TYPE_IDS));
const UUID = /^[0-9a-f-]{36}$/i;
const MAX = 500;

async function access(params, request) {
  const { user } = await requireAuth(request);
  const db = getAdminClient();
  if (!UUID.test(params.id) || !(await canEditPlaylist(db, params.id, user.id)))
    return { refus: json({ error: "Non autorisé" }, { status: 403 }) };
  return { db, user };
}

// GET : films proposés pour les titres qui n'en ont pas
export async function GET({ params, request }) {
  const { db, user, refus } = await access(params, request);
  if (refus) return refus;
  checkRateLimit(`films:${user.id}`, 5, 60_000);
  return json(await suggestWorks(db, params.id));
}

// POST { answers: [{ id, type_id, value }] } : œuvres validées par le joueur
export async function POST({ params, request }) {
  const { db, refus } = await access(params, request);
  if (refus) return refus;
  const { answers } = (await request.json().catch(() => null)) ?? {};
  const valid =
    Array.isArray(answers) &&
    answers.length <= MAX &&
    answers.every(
      (a) =>
        a &&
        typeof a.id === "string" &&
        UUID.test(a.id) &&
        TYPE_IDS.has(a.type_id) &&
        typeof a.value === "string" &&
        a.value.trim().length > 0 &&
        a.value.length <= 120,
    );
  if (!valid) return json({ error: "Réponses invalides" }, { status: 400 });
  return json({ saved: await saveWorks(db, params.id, answers) });
}
