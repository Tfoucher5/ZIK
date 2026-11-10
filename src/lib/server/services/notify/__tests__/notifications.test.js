import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeQuery } from "../../__tests__/fakeQuery.js";

const m = vi.hoisted(() => ({
  db: null,
  online: false,
  pushNotify: null,
  refresh: null,
  pushToUser: null,
  news: [],
}));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));
vi.mock("../../../socket/presence.js", () => ({
  isOnline: () => m.online,
  pushNotify: (...a) => m.pushNotify(...a),
  refreshAllNotifications: () => m.refresh(),
}));
vi.mock("../push.js", () => ({
  pushToUser: (...a) => m.pushToUser(...a),
}));
vi.mock("../../../../data/news.js", () => ({
  get NEWS() {
    return m.news;
  },
}));

const {
  createNotification,
  deleteNotifications,
  purgeCutoff,
  broadcastNotification,
  announceLatestNews,
} = await import("../notifications.js");

const NOTIF = {
  id: 5,
  type: "friend_request",
  payload: {},
  actor: { username: "lea" },
};
let rows;

beforeEach(() => {
  rows = {};
  m.online = false;
  m.pushNotify = vi.fn();
  m.refresh = vi.fn();
  m.pushToUser = vi.fn(async () => 1);
  m.news = [{ version: "3.26.0", title: "Soirées", tag: "Nouveauté" }];
  m.db = fakeQuery((q) => rows[q.table]?.(q));
});

describe("notification d'un joueur", () => {
  it("joueur en ligne : cloche en direct, pas de notification d'appareil", async () => {
    m.online = true;
    rows.notifications = () => ({ data: NOTIF });
    await createNotification({
      userId: "u1",
      type: "friend_request",
      actorId: "u2",
    });
    expect(m.pushNotify).toHaveBeenCalledWith("u1", NOTIF);
    expect(m.pushToUser).not.toHaveBeenCalled();
    expect(m.db.of("notifications")[0].args("insert")).toEqual([
      { user_id: "u1", type: "friend_request", actor_id: "u2", payload: {} },
    ]);
  });

  it("hors ligne : une seule notification d'appareil, dans sa catégorie", async () => {
    rows.notifications = () => ({ data: NOTIF });
    await createNotification({
      userId: "u1",
      type: "friend_request",
      actorId: "u2",
    });
    expect(m.pushNotify).not.toHaveBeenCalled();
    expect(m.pushToUser).toHaveBeenCalledTimes(1);
    const [user, category, msg] = m.pushToUser.mock.calls[0];
    expect([user, category]).toEqual(["u1", "social"]);
    expect(msg.body).toContain("lea");
  });

  it("type sans catégorie : catégorie vide, pushToUser n'envoie rien", async () => {
    rows.notifications = () => ({ data: { ...NOTIF, type: "inconnu" } });
    await createNotification({ userId: "u1", type: "inconnu" });
    expect(m.pushToUser.mock.calls[0][1]).toBeUndefined();
  });

  it("insertion vide ou en échec : rien n'est poussé", async () => {
    await createNotification({ userId: "u1", type: "friend_request" });
    rows.notifications = () => {
      throw new Error("table absente");
    };
    await expect(
      createNotification({ userId: "u1", type: "friend_request" }),
    ).resolves.toBeUndefined();
    expect(m.pushNotify).not.toHaveBeenCalled();
    expect(m.pushToUser).not.toHaveBeenCalled();
  });

  it("échec du push d'appareil : journalisé, l'appelant continue", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    rows.notifications = () => ({ data: NOTIF });
    m.pushToUser = vi.fn(async () => {
      throw new Error("push KO");
    });
    await createNotification({ userId: "u1", type: "friend_request" });
    await vi.waitFor(() =>
      expect(err).toHaveBeenCalledWith("[push]", "push KO"),
    );
    err.mockRestore();
  });
});

describe("nettoyage", () => {
  it("supprime avec un filtre par colonne", async () => {
    await deleteNotifications({ user_id: "u1", type: "friend_request" });
    const q = m.db.of("notifications")[0];
    expect(q.ops.filter(([n]) => n === "eq").map(([, a]) => a)).toEqual([
      ["user_id", "u1"],
      ["type", "friend_request"],
    ]);
  });

  it("panne de la base : ignorée", async () => {
    rows.notifications = () => {
      throw new Error("panne");
    };
    await expect(deleteNotifications({ id: 1 })).resolves.toBeUndefined();
  });

  it("purge : tout ce qui a plus de 24 h", () => {
    const cut = new Date(purgeCutoff()).getTime();
    expect(Date.now() - cut).toBeGreaterThanOrEqual(24 * 3600_000);
    expect(Date.now() - cut).toBeLessThan(24 * 3600_000 + 1000);
  });
});

describe("annonce à tous", () => {
  it("diffuse puis rafraîchit les cloches ouvertes", async () => {
    m.db.client.rpc.mockResolvedValueOnce({ data: 42, error: null });
    expect(await broadcastNotification("admin", { text: "hi" })).toBe(42);
    expect(m.db.client.rpc).toHaveBeenCalledWith(
      "admin_broadcast_notification",
      {
        p_type: "admin",
        p_payload: { text: "hi" },
      },
    );
    expect(m.refresh).toHaveBeenCalled();
  });

  it("refus de la base : erreur remontée, pas de rafraîchissement", async () => {
    m.db.client.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "denied" },
    });
    await expect(broadcastNotification("admin", {})).rejects.toThrow("denied");
    expect(m.refresh).not.toHaveBeenCalled();
  });
});

describe("annonce des nouveautés au démarrage", () => {
  const settings = (value, extra = {}) => {
    rows.site_settings = (q) =>
      q.has("upsert")
        ? { error: extra.setErr ?? null }
        : { data: value, error: extra.readErr ?? null };
  };

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    m.db.client.rpc.mockResolvedValue({ data: 3, error: null });
  });

  it("nouvelle version : mémorisée puis annoncée une fois", async () => {
    settings({ value: { version: "3.25.0" } });
    await announceLatestNews();
    const up = m.db.of("site_settings").find((q) => q.has("upsert"));
    expect(up.args("upsert")[0].value).toEqual({ version: "3.26.0" });
    expect(m.db.client.rpc).toHaveBeenCalledWith(
      "admin_broadcast_notification",
      {
        p_type: "news",
        p_payload: { version: "3.26.0", title: "Soirées", tag: "Nouveauté" },
      },
    );
  });

  it("version déjà annoncée (redémarrage) : rien", async () => {
    settings({ value: { version: "3.26.0" } });
    await announceLatestNews();
    expect(m.db.client.rpc).not.toHaveBeenCalled();
    expect(m.db.of("site_settings").some((q) => q.has("upsert"))).toBe(false);
  });

  it("tout premier passage : mémorise sans envoyer", async () => {
    settings(null);
    await announceLatestNews();
    expect(m.db.of("site_settings").some((q) => q.has("upsert"))).toBe(true);
    expect(m.db.client.rpc).not.toHaveBeenCalled();
  });

  it("lecture ou écriture en échec : pas d'envoi (sinon doublon au prochain démarrage)", async () => {
    settings(null, { readErr: { message: "panne" } });
    await announceLatestNews();
    settings({ value: { version: "1" } }, { setErr: { message: "panne" } });
    await announceLatestNews();
    expect(m.db.client.rpc).not.toHaveBeenCalled();
  });

  it("aucune nouveauté : rien", async () => {
    m.news = [];
    await announceLatestNews();
    expect(m.db.queries).toHaveLength(0);
  });
});
