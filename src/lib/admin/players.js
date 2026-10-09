export const avatarOf = (p) =>
  p?.avatar_url ||
  `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(p?.username ?? "")}`;

// last_played_date est un jour (AAAA-MM-JJ), sans heure
export function lastSeen(day, now = new Date()) {
  if (!day) return null;
  const [y, m, d] = day.split("-").map(Number);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const n = Math.round((today - Date.UTC(y, m - 1, d)) / 86400000);
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return "hier";
  if (n < 31) return `il y a ${n} j`;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const PLAN_LABELS = {
  night: "Soirée (24 h)",
  monthly: "Mensuel",
  yearly: "Annuel",
  manual: "Offert par l'admin",
};

export const ACTION_LABELS = {
  ban_user: "Banni",
  unban_user: "Débanni",
  edit_stats: "Stats modifiées",
  edit_username: "Pseudo modifié",
  reset_stats: "Stats remises à zéro",
  set_pro: "Accès Pro modifié",
  set_role: "Rôle modifié",
  delete_user: "Compte supprimé",
  delete_follow: "Abonnement retiré",
  delete_friendship: "Amitié supprimée",
};
