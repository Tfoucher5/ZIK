import { salonRooms, getIO } from "../../state.js";
import { isPro } from "../../services/pro.js";
import { note } from "./journal.js";
import { staff } from "./players.js";
import { saveSnapshot } from "./snapshot.js";

// Passage d'un salon vivant en ZIK Pro (paiement, accès offert, reprise).
// Appelé aussi depuis les routes HTTP : ne s'appuie que sur globalThis.

export function grantPro(salon, io) {
  if (salon.pro) return false;
  salon.pro = true;
  note(salon, "Salon passé en ZIK Pro");
  if (io) staff(salon.code, io).emit("salon_pro", { pro: true });
  saveSnapshot(salon);
  return true;
}

/** Tous les salons en mémoire de ce compte passent Pro. */
export function proForHost(userId, io = getIO()) {
  // Salons invités : hostUserId null, jamais touchés
  if (!userId) return 0;
  let n = 0;
  for (const salon of Object.values(salonRooms))
    if (salon.hostUserId === userId && grantPro(salon, io)) n++;
  return n;
}

/** Rattache un salon au compte qui paie. null si c'est fait, sinon l'erreur HTTP. */
export function attachSalon(code, key, userId) {
  if (typeof code !== "string" || !/^[A-Z0-9]{4,12}$/.test(code))
    return { status: 400, error: "Salon invalide." };
  const salon = Object.hasOwn(salonRooms, code) ? salonRooms[code] : null;
  if (!salon) return { status: 404, error: "Ce salon n'est plus en cours." };
  if (typeof key !== "string" || key !== salon.adminKey)
    return { status: 403, error: "Ce salon n'est pas le vôtre." };
  if (salon.hostUserId && salon.hostUserId !== userId)
    return { status: 403, error: "Ce salon est rattaché à un autre compte." };
  if (salon.hostUserId !== userId) {
    salon.hostUserId = userId;
    saveSnapshot(salon);
  }
  return null;
}

// Reprise après redémarrage : un paiement arrivé pendant la coupure est
// rattrapé. Ne rétrograde jamais, ne lève jamais.
export async function refreshPro(salon, io) {
  try {
    if (!salon.pro && salon.hostUserId && (await isPro(salon.hostUserId)))
      grantPro(salon, io);
  } catch (e) {
    console.error("[salon] Pro à la reprise:", e?.message ?? e);
  }
}
