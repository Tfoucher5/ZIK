import { supabase, getAdminClient } from "../config.js";

// Toutes les fonctions échouent en silence : si la migration 20260806_weekly_challenges
// n'est pas encore en place, ni le jeu ni la homepage ne doivent planter.

let _admin = null;
function db() {
  if (_admin) return _admin;
  try {
    _admin = getAdminClient();
  } catch {
    _admin = supabase;
  }
  return _admin;
}

export const CHALLENGE_TYPES = {
  correct_answers: { label: "Bonnes réponses", unit: "réponses" },
  games_played: { label: "Parties jouées", unit: "parties" },
  zikle_wins: { label: "Zikle gagnés", unit: "victoires Zikle" },
};

/**
 * Choisit/clôture la semaine (RPC atomique). Appelée "lazily" au chargement
 * de la homepage, comme getOrCreateDailySong() pour Zikle. Ne throw jamais.
 */
export async function getOrCreateWeeklyChallenge() {
  try {
    const { data, error } = await db().rpc("pick_weekly_challenge");
    if (error) throw error;
    const row = data?.[0];
    if (!row) return null;
    return { ...row, ...(CHALLENGE_TYPES[row.type] || {}) };
  } catch (e) {
    console.error("getOrCreateWeeklyChallenge:", e.message);
    return null;
  }
}

// La requête passe par le client admin (RLS ignorée) : on retire donc nous-mêmes
// les profils privés du classement, exactement comme le ferait la policy RLS
// de weekly_challenge_contributions pour un utilisateur normal.
function dropPrivate(rows) {
  return (rows || [])
    .filter((r) => !r.profiles?.is_private)
    .map(({ profiles, ...r }) => ({
      ...r,
      profiles: profiles
        ? { username: profiles.username, avatar_url: profiles.avatar_url }
        : null,
    }));
}

/** Défi courant + top 3 contributeurs, pour l'affichage homepage. */
export async function getWeeklyChallengeState() {
  const challenge = await getOrCreateWeeklyChallenge();
  if (!challenge) return null;
  try {
    const { data: top } = await db()
      .from("weekly_challenge_contributions")
      .select("amount, profiles(username, avatar_url, is_private)")
      .eq("challenge_id", challenge.id)
      .order("amount", { ascending: false })
      .limit(20);
    return { ...challenge, top: dropPrivate(top).slice(0, 3) };
  } catch {
    return { ...challenge, top: [] };
  }
}

/** Classement complet des contributeurs d'un défi (semaine en cours ou passée). */
export async function getWeeklyChallengeFullRanking(challengeId) {
  try {
    const { data } = await db()
      .from("weekly_challenge_contributions")
      .select("user_id, amount, profiles(username, avatar_url, is_private)")
      .eq("challenge_id", challengeId)
      .order("amount", { ascending: false });
    return dropPrivate(data);
  } catch {
    return [];
  }
}

/** Historique des semaines closes (succès ou échec), les plus récentes d'abord. */
export async function getWeeklyChallengeArchives(limit = 52) {
  try {
    const { data } = await db()
      .from("weekly_challenges")
      .select(
        "id, week_start, week_end, type, target, current_value, status, top_contributor_amount, top_contributor:profiles(username, avatar_url, is_private)",
      )
      .neq("status", "active")
      .order("week_start", { ascending: false })
      .limit(limit);
    return (data || []).map((row) => ({
      ...row,
      ...(CHALLENGE_TYPES[row.type] || {}),
      top_contributor: row.top_contributor?.is_private
        ? null
        : row.top_contributor,
    }));
  } catch (e) {
    console.error("getWeeklyChallengeArchives:", e.message);
    return [];
  }
}

/** Défi (n'importe quel statut) pour une semaine donnée + classement complet. */
export async function getWeeklyChallengeByWeekStart(weekStart) {
  try {
    const { data: row, error } = await db()
      .from("weekly_challenges")
      .select("*")
      .eq("week_start", weekStart)
      .single();
    if (error || !row) return null;
    const ranking = await getWeeklyChallengeFullRanking(row.id);
    return { ...row, ...(CHALLENGE_TYPES[row.type] || {}), ranking };
  } catch (e) {
    console.error("getWeeklyChallengeByWeekStart:", e.message);
    return null;
  }
}

/**
 * Fire-and-forget STRICT : ne jamais faire `await bumpWeeklyChallenge(...)` dans
 * un chemin temps réel — la requête part en tâche de fond et absorbe ses erreurs.
 */
export function bumpWeeklyChallenge(type, userId, amount = 1) {
  if (!userId || amount <= 0) return;
  try {
    db()
      .rpc("increment_weekly_challenge", {
        p_type: type,
        p_user_id: userId,
        p_amount: amount,
      })
      .then(({ error }) => {
        if (error) console.error("bumpWeeklyChallenge:", error.message);
      })
      .catch((e) => console.error("bumpWeeklyChallenge:", e.message));
  } catch (e) {
    console.error("bumpWeeklyChallenge:", e.message);
  }
}

// ── Admin ────────────────────────────────────────────────────────────────────
// Contrairement aux fonctions ci-dessus, celles-ci remontent leurs erreurs :
// l'admin doit savoir quand une action n'a pas marché.

export const CHALLENGE_ROTATION = [
  "correct_answers",
  "games_played",
  "zikle_wins",
];
export const AUTO_TARGETS = {
  correct_answers: 5000,
  games_played: 300,
  zikle_wins: 150,
};

/** Type que pick_weekly_challenge() choisira après `lastType` si rien n'est programmé. */
export function nextAutoType(lastType) {
  const i = CHALLENGE_ROTATION.indexOf(lastType);
  return CHALLENGE_ROTATION[(i + 1) % CHALLENGE_ROTATION.length];
}

/** Lundi (YYYY-MM-DD) de la semaine d'une date YYYY-MM-DD, décalé de `weeks`. */
export function mondayOf(dateStr, weeks = 0) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function roundNice(n) {
  const step = n < 50 ? 5 : n < 500 ? 10 : n < 5000 ? 50 : 100;
  return Math.max(step, Math.round(n / step) * step);
}

/**
 * Objectif réaliste : moyenne des 3 dernières semaines closes du même type
 * (semaines à 0 ignorées) + 20 %. `null` s'il n'y a pas d'historique.
 */
export function suggestTarget(weeks, type) {
  const past = weeks
    .filter(
      (w) => w.type === type && w.status !== "active" && w.current_value > 0,
    )
    .slice(0, 3);
  if (!past.length) return null;
  const avg = past.reduce((s, w) => s + w.current_value, 0) / past.length;
  return {
    target: roundNice(avg * 1.2),
    basedOn: past.map((w) => w.current_value),
  };
}

export async function getWeeklyChallengesForAdmin(limit = 26) {
  const { data, error } = await db()
    .from("weekly_challenges")
    .select(
      "id, week_start, week_end, type, target, current_value, status, top_contributor_amount, closed_at, top_contributor:profiles(id, username)",
    )
    .order("week_start", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Contributeurs d'un défi, profils privés compris (vue admin). */
export async function getWeeklyContributorsForAdmin(challengeId, limit = 10) {
  const { data, error, count } = await db()
    .from("weekly_challenge_contributions")
    .select("user_id, amount, profiles(username, avatar_url)", {
      count: "exact",
    })
    .eq("challenge_id", challengeId)
    .order("amount", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return { top: data || [], total: count ?? 0 };
}

/**
 * Change l'objectif du défi en cours. Changer le type remet le compteur et les
 * contributions à zéro : ce qui a été compté ne correspond plus au nouveau défi.
 */
export async function updateActiveWeeklyChallenge(id, type, target) {
  const sb = db();
  const { data: row, error } = await sb
    .from("weekly_challenges")
    .select("type, status")
    .eq("id", id)
    .single();
  if (error) throw error;
  if (row.status !== "active") throw new Error("Ce défi est déjà terminé.");
  const reset = row.type !== type;
  if (reset) {
    const { error: delErr } = await sb
      .from("weekly_challenge_contributions")
      .delete()
      .eq("challenge_id", id);
    if (delErr) throw delErr;
  }
  const { error: upErr } = await sb
    .from("weekly_challenges")
    .update(reset ? { type, target, current_value: 0 } : { target })
    .eq("id", id);
  if (upErr) throw upErr;
  return { reset };
}

/** Programme (ou remplace) le défi d'une semaine future. Voir 20261010_admin_defi_semaine.sql. */
export async function scheduleWeeklyChallenge(weekStart, type, target) {
  const { error } = await db().rpc("admin_schedule_weekly_challenge", {
    p_week_start: weekStart,
    p_type: type,
    p_target: target,
  });
  if (error) throw error;
}

export async function cancelScheduledWeeklyChallenge(weekStart, today) {
  if (weekStart <= mondayOf(today))
    throw new Error("Seule une semaine à venir peut être annulée.");
  const { error } = await db()
    .from("weekly_challenges")
    .delete()
    .eq("week_start", weekStart)
    .eq("status", "active")
    .eq("current_value", 0);
  if (error) throw error;
}
