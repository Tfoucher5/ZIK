import { json } from "@sveltejs/kit";
import {
  requireAdminToken,
  logAdminAction,
} from "$lib/server/middleware/auth.js";
import { addAnswers, removeAnswers } from "$lib/admin/contenu.server.js";

export async function POST({ url, request }) {
  const admin = await requireAdminToken(url.searchParams.get("token"));
  const { trackId, entryIds, typeId, value } = await request.json();
  const ids = Array.isArray(entryIds) ? entryIds.filter(Boolean) : [];
  const err = await addAnswers(ids, typeId, value);
  if (err) return json({ error: err }, { status: 400 });
  await logAdminAction(admin.id, "add_track_answer", trackId, "track", {
    entries: ids.length,
    type_id: Number(typeId),
    value: String(value).trim(),
  });
  return json({ ok: true });
}

export async function DELETE({ url, request }) {
  const admin = await requireAdminToken(url.searchParams.get("token"));
  const { trackId, ids } = await request.json();
  if (!Array.isArray(ids) || !ids.length)
    return json({ error: "Réponse manquante" }, { status: 400 });
  const res = await removeAnswers(ids);
  if (res.error) return json({ error: res.error }, { status: 400 });
  await logAdminAction(admin.id, "delete_track_answer", trackId, "track", {
    value: res.value,
  });
  return json({ ok: true });
}
