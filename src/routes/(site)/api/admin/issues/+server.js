import { json } from "@sveltejs/kit";
import {
  requireAdminToken,
  logAdminAction,
} from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";

const SELECT =
  "id, kind, source, note, context, count, status, created_at, updated_at, resolved_at, track:track_id(id, artist, title, cover_url, youtube_id, youtube_start, preview_url)";

export async function GET({ url }) {
  await requireAdminToken(url.searchParams.get("token"));
  const open = url.searchParams.get("status") !== "done";

  let q = getAdminClient().from("track_issues").select(SELECT);
  q = open
    ? q.eq("status", "open").order("count", { ascending: false })
    : q.neq("status", "open").order("resolved_at", { ascending: false });
  const { data, error } = await q
    .order("updated_at", { ascending: false })
    .limit(open ? 200 : 40);

  if (error) {
    return json(
      {
        error:
          "Table track_issues absente : appliquer la migration 20261009b_admin_pilotage.sql.",
      },
      { status: 503 },
    );
  }
  return json({ issues: data });
}

const STATUS = { fix: "fixed", ignore: "ignored", reopen: "open" };

export async function POST({ url, request }) {
  const admin = await requireAdminToken(url.searchParams.get("token"));
  const { id, action } = await request.json();
  const status = STATUS[action];
  if (!id || !status)
    return json({ error: "Action invalide" }, { status: 400 });

  const { data, error } = await getAdminClient()
    .from("track_issues")
    .update({
      status,
      resolved_at: status === "open" ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("track_id, kind")
    .single();
  if (error) {
    // Rouvrir échoue si un nouveau problème du même type est déjà ouvert
    return json(
      {
        error:
          error.code === "23505"
            ? "Un problème du même type est déjà ouvert pour ce titre."
            : error.message,
      },
      { status: 409 },
    );
  }

  await logAdminAction(
    admin.id,
    `track_issue_${action}`,
    data.track_id,
    "track",
    {
      kind: data.kind,
    },
  );
  return json({ ok: true });
}
