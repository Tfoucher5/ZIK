// Catégories de notifications du joueur connecté, partagées entre les Paramètres
// et les invitations à activer les notifications.

export const NOTIF_CATEGORIES = [
  {
    id: "social",
    label: "Amis et invitations",
    desc: "Demandes d'ami et invitations à rejoindre une room.",
  },
  {
    id: "cards",
    label: "Cartes",
    desc: "Carte qui monte de rareté, Mythique d’un ami, set presque terminé.",
  },
  {
    id: "challenge",
    label: "Défi de la semaine",
    desc: "Nouveau défi le lundi, dernier jour le dimanche.",
  },
  {
    id: "zikle",
    label: "Rappel Zikle",
    desc: "Vers 18 h, si tu n'as pas encore fait le Zikle du jour.",
  },
  {
    id: "updates",
    label: "Nouveautés de ZIK",
    desc: "À chaque nouvelle version du site, pas pour les petits correctifs.",
  },
  {
    id: "venues",
    label: "Lieux suivis",
    desc: "Quand un bar ou un lieu que tu suis annonce une soirée blind test.",
  },
];

export function tokenGetter(sb) {
  return async () => (await sb.auth.getSession())?.data?.session?.access_token;
}

let _prefs = $state(null);
let pending = null;

async function api(getToken, method, body) {
  const r = await fetch("/api/push/prefs", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error();
  return r.json();
}

export const notifPrefs = {
  get value() {
    return _prefs;
  },
  load(getToken) {
    pending ??= api(getToken, "GET")
      .then((p) => (_prefs = p))
      .catch(() => (pending = null));
    return pending;
  },
  /** Enregistre un changement, l'affichage suit tout de suite. */
  async set(getToken, patch) {
    const before = _prefs;
    _prefs = { ..._prefs, ...patch };
    try {
      _prefs = await api(getToken, "PUT", patch);
    } catch (e) {
      _prefs = before;
      throw e;
    }
  },
  reset() {
    _prefs = null;
    pending = null;
  },
};
