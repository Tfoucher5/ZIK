import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { requireAuth, checkRateLimit } from "$lib/server/middleware/auth.js";
import {
  canEditPlaylist,
  saveWorks,
  suggestWorks,
} from "$lib/server/services/music/workSuggest.js";
import { forgetPlaylists } from "$lib/server/services/admin/contenu.js";
import { WORK_ANSWER_TYPES } from "$lib/shared/playlist/work.js";

const TYPE_IDS = new Set(WORK_ANSWER_TYPES.map((t) => t.id));
const UUID = /^[0-9a-f-]{36}$/i;
const MAX = 500;

async function access(params, request) {
  const { user } = await requireAuth(request);
  const db = getAdminClient();
  if (!UUID.test(params.id) || !(await canEditPlaylist(db, params.id, user.id)))
    return { refus: json({ error: "Non autorisé" }, { status: 403 }) };
  return { db, user };
}

// GET ?from=N : films proposés pour les titres qui n'en ont pas, par passages
export async function GET({ params, request, url }) {
  const { db, user, refus } = await access(params, request);
  if (refus) return refus;
  checkRateLimit(`films:${user.id}`, 5, 60_000);
  const from = Math.max(0, parseInt(url.searchParams.get("from")) || 0);
  return json(await suggestWorks(db, params.id, user.id, from));
}

// POST { answers: [{ id, type_id, value }] } : œuvres validées par le joueur
export async function POST({ params, request }) {
  const { db, user, refus } = await access(params, request);
  if (refus) return refus;
  checkRateLimit(`films-save:${user.id}`, 10, 60_000);
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
  const saved = await saveWorks(db, params.id, answers);
  if (saved) await forgetPlaylists([params.id]);
  return json({ saved });
}
