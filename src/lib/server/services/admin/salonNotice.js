import { getAdminClient } from "../../config.js";
import { getIO, salonRooms, setSalonNotice } from "../../state.js";

// Annonce de l'admin (maintenance à venir, incident) : bandeau sur la TV, la
// régie, les téléphones et /statut. Gardée en base pour survivre au redémarrage
// qu'elle annonce souvent. Lue en mémoire : un salon qui rejoint n'attend pas la base.

const KEY = "salon_notice";
const RETRY_MS = 60 * 1000;
export const NOTICE_MAX = 200;

function apply(message) {
  setSalonNotice(message);
  const io = getIO();
  for (const code of Object.keys(salonRooms))
    io?.to(`salon:${code}`).emit("salon_notice", { message });
}

export async function loadSalonNotice() {
  try {
    const { data, error } = await getAdminClient()
      .from("site_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    if (error) throw error;
    apply(data?.value?.message ?? "");
  } catch (e) {
    console.warn("[annonce] lecture :", e?.message ?? e);
    setTimeout(loadSalonNotice, RETRY_MS).unref();
  }
}

/** Publie l'annonce partout. Un message vide la retire. */
export async function publishSalonNotice(message) {
  const text = (typeof message === "string" ? message : "")
    .trim()
    .slice(0, NOTICE_MAX);
  const { error } = await getAdminClient()
    .from("site_settings")
    .upsert(
      {
        key: KEY,
        value: { message: text },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
  apply(text);
  return text;
}
