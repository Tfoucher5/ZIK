import { getAdminClient } from "../config.js";

// Abonnement ZIK Pro en cours pour ce compte (payé ou donné par l'admin)
export async function isPro(userId) {
  if (!userId) return false;
  const { data } = await getAdminClient()
    .from("pro_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return (
    data?.status === "active" && new Date(data.current_period_end) > new Date()
  );
}
