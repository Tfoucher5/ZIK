import { fail } from "@sveltejs/kit";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { todayParis } from "$lib/server/services/zikle.js";
import {
  AUTO_TARGETS,
  CHALLENGE_TYPES,
  cancelScheduledWeeklyChallenge,
  getOrCreateWeeklyChallenge,
  getWeeklyChallengesForAdmin,
  getWeeklyContributorsForAdmin,
  mondayOf,
  nextAutoType,
  scheduleWeeklyChallenge,
  suggestTarget,
  updateActiveWeeklyChallenge,
} from "$lib/server/services/weeklyChallenge.js";

function readChallenge(form) {
  const type = String(form.get("type") || "");
  const target = Number(form.get("target"));
  if (!CHALLENGE_TYPES[type]) return { error: "Choisis un type de défi." };
  if (!Number.isInteger(target) || target <= 0 || target > 1_000_000)
    return { error: "L'objectif doit être un nombre entier positif." };
  return { type, target };
}

export async function load() {
  const today = todayParis();
  const thisMonday = mondayOf(today);
  const nextMonday = mondayOf(today, 1);

  const current = await getOrCreateWeeklyChallenge();
  const weeks = await getWeeklyChallengesForAdmin(30);
  const contributors = current
    ? await getWeeklyContributorsForAdmin(current.id, 10)
    : { top: [], total: 0 };

  const next = weeks.find((w) => w.week_start === nextMonday) || null;
  const autoType = nextAutoType(current?.type);
  const suggestions = Object.fromEntries(
    Object.keys(CHALLENGE_TYPES).map((t) => [t, suggestTarget(weeks, t)]),
  );

  return {
    today,
    thisMonday,
    nextMonday,
    current,
    contributors,
    next,
    auto: { type: autoType, target: AUTO_TARGETS[autoType] },
    history: weeks.filter((w) => w.week_start < thisMonday),
    suggestions,
  };
}

export const actions = {
  editCurrent: async ({ request, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") || "");
    const c = readChallenge(form);
    if (c.error) return fail(400, { currentError: c.error });
    try {
      const { reset } = await updateActiveWeeklyChallenge(id, c.type, c.target);
      await logAdminAction(
        locals.adminId,
        "weekly_challenge_edit",
        id,
        "weekly_challenge",
        { ...c, reset },
      );
      return { currentSaved: reset ? "reset" : "target" };
    } catch (e) {
      return fail(500, { currentError: e.message });
    }
  },

  scheduleNext: async ({ request, locals }) => {
    const form = await request.formData();
    const c = readChallenge(form);
    if (c.error) return fail(400, { nextError: c.error });
    const weekStart = mondayOf(todayParis(), 1);
    try {
      await scheduleWeeklyChallenge(weekStart, c.type, c.target);
    } catch (e) {
      const missing =
        e.code === "PGRST202" ||
        /admin_schedule_weekly_challenge/.test(e.message);
      return fail(500, {
        nextError: missing
          ? "La migration 20261010_admin_defi_semaine.sql doit d'abord être appliquée sur la base."
          : e.message,
      });
    }
    await logAdminAction(
      locals.adminId,
      "weekly_challenge_schedule",
      weekStart,
      "weekly_challenge",
      c,
    );
    return { nextSaved: true };
  },

  cancelNext: async ({ locals }) => {
    const today = todayParis();
    const weekStart = mondayOf(today, 1);
    try {
      await cancelScheduledWeeklyChallenge(weekStart, today);
    } catch (e) {
      return fail(500, { nextError: e.message });
    }
    await logAdminAction(
      locals.adminId,
      "weekly_challenge_unschedule",
      weekStart,
      "weekly_challenge",
    );
    return { nextCanceled: true };
  },
};
