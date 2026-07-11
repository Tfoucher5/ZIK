// Store global notifications + présence (socket léger connecté depuis le layout).
let _list = $state([]);
let _unread = $state(0);
let _socket = null;
let _getToken = null;

export const notifState = {
  get list() {
    return _list;
  },
  get unread() {
    return _unread;
  },
};

async function refresh() {
  const token = await _getToken?.();
  if (!token) return;
  try {
    const r = await fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return;
    const d = await r.json();
    _list = d.notifications || [];
    _unread = d.unreadCount || 0;
  } catch {
    /* réseau indisponible */
  }
}

export async function initNotifications(sb) {
  if (_socket || !sb) return;
  _getToken = async () =>
    (await sb.auth.getSession())?.data?.session?.access_token;
  const token = await _getToken();
  if (!token) return;

  refresh();

  const { io } = await import("socket.io-client");
  _socket = io({
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });
  _socket.on("connect", async () => {
    const t = await _getToken();
    if (t) _socket.emit("presence:hello", t);
  });
  _socket.on("notify", (n) => {
    _list = [n, ..._list].slice(0, 50);
    _unread += 1;
  });
}

export function teardownNotifications() {
  _socket?.disconnect();
  _socket = null;
  _list = [];
  _unread = 0;
}

export async function markAllRead() {
  if (!_unread) return;
  _unread = 0;
  _list = _list.map((n) => (n.read ? n : { ...n, read: true }));
  const token = await _getToken?.();
  if (!token) return;
  fetch("/api/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "read" }),
  }).catch(() => {});
}

export function dismissNotif(id) {
  _list = _list.filter((n) => n.id !== id);
}
