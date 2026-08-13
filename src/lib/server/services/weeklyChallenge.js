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
