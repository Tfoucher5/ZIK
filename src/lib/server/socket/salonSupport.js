import { salonRooms, getIO } from "../state.js";
import { alertAdminsSafe } from "../services/adminAlerts.js";

// Chat en direct entre l'organisateur d'un salon (régie ou écran TV) et
// l'admin. Tout reste en mémoire sur le salon : rien n'est gardé après la
// soirée, le report créé à l'appel sert de trace.

export const SUPPORT_MAX_MESSAGES = 100;
const MAX_LENGTH = 500;
const CALL_ALERT_THROTTLE = 2 * 60 * 1000;

function cleanText(text) {
  return String(text ?? "")
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .trim()
    .slice(0, MAX_LENGTH);
}

function salonOf(code) {
  const salon = code && salonRooms[code];
  if (!salon) throw new Error("Ce salon n'est plus en cours.");
  return salon;
}

function thread(salon) {
  return (salon.support ??= {
    open: false,
    requestedAt: null,
    closedAt: null,
    adminJoined: false,
    seq: 0,
    messages: [],
  });
}

/** Ce que voient la régie, l'écran TV et l'admin. null : aucun échange. */
export function supportView(salon) {
  const s = salon?.support;
  if (!s) return null;
  return {
    open: s.open,
    requestedAt: s.requestedAt,
    closedAt: s.closedAt,
    adminJoined: s.adminJoined,
    messages: s.messages,
  };
}

function broadcast(salon) {
  getIO()
    ?.to([`salon:screens:${salon.code}`, `salon:ctrl:${salon.code}`])
    .emit("salon_support", supportView(salon));
}

function push(salon, from, text) {
  const s = thread(salon);
  s.messages.push({ id: ++s.seq, from, text, at: Date.now() });
  if (s.messages.length > SUPPORT_MAX_MESSAGES)
    s.messages.splice(0, s.messages.length - SUPPORT_MAX_MESSAGES);
}

/** L'organisateur appelle un admin, avec un message facultatif. */
export function callSupport(code, text) {
  const salon = salonOf(code);
  const s = thread(salon);
  const message = cleanText(text);
  if (!s.open) {
    s.open = true;
    s.requestedAt = Date.now();
    s.closedAt = null;
    s.adminJoined = false;
  } else if (!s.requestedAt) s.requestedAt = Date.now();
  if (message) push(salon, "host", message);
  alertAdminsSafe(
    "admin_salons",
    {
      title: `Salon ${code} : un organisateur appelle un admin`,
      body: message.slice(0, 140) || "Pas de message : ouvre le chat du salon.",
      url: `/admin/salons?code=${code}`,
      tag: `call:${code}`,
    },
    { throttleMs: CALL_ALERT_THROTTLE },
  );
  broadcast(salon);
  return supportView(salon);
}

/** Un message dans le chat. L'admin qui écrit ouvre l'échange. */
export function sendSupportMessage(code, from, text) {
  const salon = salonOf(code);
  const message = cleanText(text);
  if (!message) throw new Error("Le message est vide.");
  const s = thread(salon);
  if (from === "admin") {
    s.open = true;
    s.closedAt = null;
    s.adminJoined = true;
  } else if (!s.open) return callSupport(code, message);
  push(salon, from, message);
  broadcast(salon);
  return supportView(salon);
}

/** L'admin a ouvert la fiche : l'organisateur voit qu'il est là. */
export function markAdminJoined(code) {
  const s = salonRooms[code]?.support;
  if (!s?.open || s.adminJoined) return;
  s.adminJoined = true;
  broadcast(salonRooms[code]);
}

export function closeSupport(code) {
  const salon = salonOf(code);
  const s = salon.support;
  if (!s?.open) throw new Error("Aucune demande en cours sur ce salon.");
  s.open = false;
  s.closedAt = Date.now();
  broadcast(salon);
}

/** Demandes d'aide en attente, pour les badges de l'admin. */
export function openSupportCount() {
  return Object.values(salonRooms).filter(
    (s) => s.support?.open && s.support.requestedAt,
  ).length;
}

export function registerSupport(socket) {
  const salonCode = () => (socket.salonAdmin ? socket.salonCode : null);
  const reply = (ack, run) => {
    let res;
    try {
      res = { ok: true, support: run() };
    } catch (e) {
      res = { ok: false, error: e.message };
    }
    if (typeof ack === "function") ack(res);
  };

  socket.on("salon_support_call", ({ message } = {}, ack) =>
    reply(ack, () => callSupport(salonCode(), message)),
  );
  socket.on("salon_support_send", ({ text } = {}, ack) =>
    reply(ack, () => sendSupportMessage(salonCode(), "host", text)),
  );
}
