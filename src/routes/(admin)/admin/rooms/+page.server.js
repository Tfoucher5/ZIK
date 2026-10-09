import { error } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_FLAGS = ["is_official", "is_public"];
const DAY = 86400_000;

function readId(formData) {
  const id = formData.get("id");
  if (!UUID_RE.test(id ?? "")) throw error(400, "ID invalide");
  return id;
}

const clamp = (v, min, max, def) =>
  Math.min(max, Math.max(min, parseInt(v, 10) || def));

export async function load() {
  const sb = getAdminClient();
  const since = new Date(Date.now() - 7 * DAY).toISOString();

  const [{ data: rooms, error: err }, { data: games }] = await Promise.all([
    sb
      .from("rooms")
      .select(
        "id, code, name, emoji, description, owner_id, is_public, is_official, auto_start, max_rounds, round_duration, break_duration, created_at, last_active_at, profiles!owner_id(username)",
      )
      .order("last_active_at", { ascending: false, nullsFirst: false })
      .limit(5000),
    sb
      .from("games")
      .select("room_id, started_at, player_count")
      .eq("source", "web")
      .gte("started_at", since)
      .limit(20000),
  ]);

  const plays = {};
  const players = {};
  const perDay = {};
  for (const g of games ?? []) {
    plays[g.room_id] = (plays[g.room_id] ?? 0) + 1;
    players[g.room_id] = (players[g.room_id] ?? 0) + (g.player_count ?? 0);
    const d = g.started_at.slice(0, 10);
    perDay[d] = (perDay[d] ?? 0) + 1;
  }

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    days.push({
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3),
      value: perDay[key] ?? 0,
    });
  }

  const live = globalThis.__zik_roomGames ?? {};
  return {
    rooms: (rooms ?? []).map((r) => ({
      ...r,
      owner: r.profiles?.username ?? null,
      plays7: plays[r.code] ?? 0,
      players7: players[r.code] ?? 0,
      liveNow: Object.keys(live[r.code]?.players ?? {}).length,
    })),
    days,
    games7: games?.length ?? 0,
    error: err?.message ?? null,
  };
}

export const actions = {
  toggleFlag: async ({ request, locals }) => {
    const formData = await request.formData();
    const id = readId(formData);
    const field = formData.get("field");
    const value = formData.get("value") === "true";
    if (!ALLOWED_FLAGS.includes(field)) throw error(400, "Champ invalide");
    const { error: err } = await getAdminClient()
      .from("rooms")
      .update({ [field]: value })
      .eq("id", id);
    if (err) return { success: false, error: err.message };
    await logAdminAction(locals.adminId, "toggle_room_flag", id, "room", {
      field,
      value,
    });
    return { success: true };
  },

  editRoom: async ({ request, locals }) => {
    const formData = await request.formData();
    const id = readId(formData);
    const name = formData.get("name")?.trim();
    if (!name || name.length > 60)
      return { success: false, error: "Le nom doit faire 1 à 60 caractères." };
    const fields = {
      name,
      emoji: formData.get("emoji")?.trim() || "🎵",
      description: formData.get("description")?.trim() || null,
      max_rounds: clamp(formData.get("max_rounds"), 3, 50, 10),
      round_duration: clamp(formData.get("round_duration"), 10, 60, 30),
      break_duration: clamp(formData.get("break_duration"), 3, 15, 7),
      auto_start: formData.get("auto_start") === "on",
    };
    const { error: err } = await getAdminClient()
      .from("rooms")
      .update(fields)
      .eq("id", id);
    if (err) return { success: false, error: err.message };
    await logAdminAction(locals.adminId, "edit_room", id, "room", fields);
    return { success: true };
  },

  deleteRoom: async ({ request, locals }) => {
    const id = readId(await request.formData());
    const sb = getAdminClient();
    const { data: room } = await sb
      .from("rooms")
      .select("code, name")
      .eq("id", id)
      .single();
    if (!room) return { success: false, error: "Room introuvable" };
    const { error: err } = await sb.from("rooms").delete().eq("id", id);
    if (err) return { success: false, error: err.message };
    await logAdminAction(locals.adminId, "delete_room", id, "room", room);
    return { success: true };
  },
};
