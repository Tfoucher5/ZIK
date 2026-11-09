import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fakeQuery } from "../../__tests__/fakeQuery.js";

const m = vi.hoisted(() => ({ db: null, log: null }));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));
vi.mock("../../../middleware/auth.js", () => ({
  logAdminAction: (...a) => m.log(...a),
}));

const actions = await import("../userActions.js");
const {
  banUser,
  unbanUser,
  updateUserStats,
  updateUsername,
  resetUserStats,
  grantPro,
  setUserRole,
  deleteUserAccount,
  deleteFollow,
  deleteFriendship,
} = actions;

const ADMIN = "admin-1";
const USER = "user-1";
let rows;

beforeEach(() => {
  rows = {};
  m.log = vi.fn(async () => {});
  m.db = fakeQuery((q) => rows[q.table]?.(q));
});
afterEach(() => vi.useRealTimers());

describe("bannir et débannir", () => {
  it("bannit pour la durée demandée et le note au journal", async () => {
    expect(await banUser(ADMIN, USER, "168h")).toBeUndefined();
    expect(m.db.client.auth.admin.updateUserById).toHaveBeenCalledWith(USER, {
      ban_duration: "168h",
    });
    expect(m.log).toHaveBeenCalledWith(ADMIN, "ban_user", USER, "user", {
      duration: "168h",
    });
  });

  it("débannir remet ban_duration à none", async () => {
    await unbanUser(ADMIN, USER);
    expect(m.db.client.auth.admin.updateUserById).toHaveBeenCalledWith(USER, {
      ban_duration: "none",
    });
    expect(m.log.mock.calls[0][1]).toBe("unban_user");
  });

  it("échec de Supabase : erreur 500 rendue, rien au journal", async () => {
    m.db.client.auth.admin.updateUserById.mockResolvedValueOnce({
      error: { message: "user not found" },
    });
    expect(await banUser(ADMIN, USER, "24h")).toEqual({
      status: 500,
      error: "user not found",
    });
    expect(m.log).not.toHaveBeenCalled();
  });

  it("les durées proposées sont celles que la route accepte", () => {
    expect(actions.BAN_DURATIONS).toEqual([
      "24h",
      "168h",
      "720h",
      "8760h",
      "87600h",
    ]);
  });
});

describe("rôle et stats", () => {
  it("change le rôle du bon profil seulement", async () => {
    await setUserRole(ADMIN, USER, "super_admin");
    const [q] = m.db.of("profiles");
    expect(q.args("update")).toEqual([{ role: "super_admin" }]);
    expect(q.args("eq")).toEqual(["id", USER]);
    expect(m.log).toHaveBeenCalledWith(ADMIN, "set_role", USER, "user", {
      role: "super_admin",
    });
  });

  it("refus de la base : le rôle n'est pas journalisé comme changé", async () => {
    rows.profiles = () => ({ error: { message: "rls" } });
    expect(await setUserRole(ADMIN, USER, "user")).toEqual({
      status: 500,
      error: "rls",
    });
    expect(m.log).not.toHaveBeenCalled();
  });

  it("édite xp, elo et niveau, sans autre colonne", async () => {
    await updateUserStats(ADMIN, USER, { xp: 5, elo: 1200, level: 3, x: 1 });
    expect(m.db.of("profiles")[0].args("update")).toEqual([
      { xp: 5, elo: 1200, level: 3 },
    ]);
  });

  it("remise à zéro : valeurs de départ d'un nouveau compte", async () => {
    await resetUserStats(ADMIN, USER);
    expect(m.db.of("profiles")[0].args("update")).toEqual([
      { xp: 0, elo: 1000, level: 1, games_played: 0, total_score: 0 },
    ]);
    expect(m.log.mock.calls[0][1]).toBe("reset_stats");
  });
});

describe("pseudo", () => {
  it("pseudo déjà pris : message clair en 400", async () => {
    rows.profiles = () => ({ error: { code: "23505", message: "dup" } });
    expect(await updateUsername(ADMIN, USER, "lea")).toEqual({
      status: 400,
      error: "Ce pseudo est déjà pris.",
    });
    expect(m.log).not.toHaveBeenCalled();
  });

  it("autre erreur : message de la base", async () => {
    rows.profiles = () => ({ error: { code: "XX", message: "panne" } });
    expect((await updateUsername(ADMIN, USER, "lea")).error).toBe("panne");
  });

  it("succès : journalisé avec le nouveau pseudo", async () => {
    expect(await updateUsername(ADMIN, USER, "lea")).toBeUndefined();
    expect(m.log).toHaveBeenCalledWith(ADMIN, "edit_username", USER, "user", {
      username: "lea",
    });
  });
});

describe("Pro offert", () => {
  const NOW = new Date("2026-11-09T12:00:00Z").getTime();
  const DAY = 86400000;
  const endOf = () =>
    new Date(
      m.db.of("pro_subscriptions")[1].args("upsert")[0].current_period_end,
    ).getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("sans abonnement : part d'aujourd'hui", async () => {
    await grantPro(ADMIN, USER, 30);
    expect(endOf()).toBe(NOW + 30 * DAY);
    const row = m.db.of("pro_subscriptions")[1].args("upsert")[0];
    expect(row).toMatchObject({
      user_id: USER,
      plan: "manual",
      status: "active",
    });
  });

  it("abonnement actif : prolonge sa date de fin", async () => {
    const end = NOW + 10 * DAY;
    rows.pro_subscriptions = (q) =>
      q.has("maybeSingle")
        ? {
            data: {
              status: "active",
              current_period_end: new Date(end).toISOString(),
            },
          }
        : undefined;
    await grantPro(ADMIN, USER, 5);
    expect(endOf()).toBe(end + 5 * DAY);
  });

  it("abonnement expiré ou résilié : ne prolonge pas une date passée", async () => {
    rows.pro_subscriptions = (q) =>
      q.has("maybeSingle")
        ? {
            data: {
              status: "canceled",
              current_period_end: new Date(NOW + 99 * DAY).toISOString(),
            },
          }
        : undefined;
    await grantPro(ADMIN, USER, 1);
    expect(endOf()).toBe(NOW + DAY);
  });

  it("0 jour : retire l'accès", async () => {
    await grantPro(ADMIN, USER, 0);
    const [q] = m.db.of("pro_subscriptions");
    expect(q.has("delete")).toBe(true);
    expect(q.args("eq")).toEqual(["user_id", USER]);
    expect(m.log).toHaveBeenCalledWith(ADMIN, "set_pro", USER, "user", {
      days: 0,
    });
  });

  it("écriture refusée : erreur rendue, pas de journal", async () => {
    rows.pro_subscriptions = (q) =>
      q.has("upsert") ? { error: { message: "panne" } } : undefined;
    expect(await grantPro(ADMIN, USER, 3)).toEqual({
      status: 500,
      error: "panne",
    });
    expect(m.log).not.toHaveBeenCalled();
  });

  it.fails(
    "BUG : retrait du Pro (0 jour) en échec annoncé comme réussi",
    async () => {
      rows.pro_subscriptions = () => ({ error: { message: "panne" } });
      expect(await grantPro(ADMIN, USER, 0)).toEqual({
        status: 500,
        error: "panne",
      });
      expect(m.log).not.toHaveBeenCalled();
    },
  );
});

describe("suppression de compte", () => {
  it("pseudo de confirmation faux : rien n'est supprimé", async () => {
    rows.profiles = () => ({ data: { username: "lea" } });
    expect(await deleteUserAccount(ADMIN, USER, "Lea")).toEqual({
      status: 400,
      error: "Pseudo incorrect, suppression annulée.",
    });
    expect(m.db.client.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it.each([undefined, null, "", 42])(
    "confirmation absente ou anormale (%s) : rien n'est supprimé",
    async (confirm) => {
      rows.profiles = () => ({ data: { username: "lea" } });
      expect((await deleteUserAccount(ADMIN, USER, confirm)).status).toBe(400);
      expect(m.db.client.auth.admin.deleteUser).not.toHaveBeenCalled();
    },
  );

  it("bon pseudo : compte supprimé et journalisé", async () => {
    rows.profiles = () => ({ data: { username: "lea" } });
    expect(await deleteUserAccount(ADMIN, USER, "lea")).toBeUndefined();
    expect(m.db.client.auth.admin.deleteUser).toHaveBeenCalledWith(USER);
    expect(m.log).toHaveBeenCalledWith(ADMIN, "delete_user", USER, "user", {
      username: "lea",
    });
  });

  it("suppression refusée par Supabase : erreur 500, pas de journal", async () => {
    rows.profiles = () => ({ data: { username: "lea" } });
    m.db.client.auth.admin.deleteUser.mockResolvedValueOnce({
      error: { message: "panne" },
    });
    expect(await deleteUserAccount(ADMIN, USER, "lea")).toEqual({
      status: 500,
      error: "panne",
    });
    expect(m.log).not.toHaveBeenCalled();
  });

  it.fails(
    "BUG : profil absent et confirmation vide, le compte est supprimé sans confirmation",
    async () => {
      rows.profiles = () => ({ data: null, error: { message: "0 rows" } });
      // le TypeError qui suit la suppression ne doit pas masquer l'assertion
      const res = await deleteUserAccount(ADMIN, USER, undefined).catch(
        () => null,
      );
      expect(m.db.client.auth.admin.deleteUser).not.toHaveBeenCalled();
      expect(res?.status).toBe(400);
    },
  );
});

describe("liens sociaux", () => {
  it("retire un abonnement par son id", async () => {
    await deleteFollow(ADMIN, USER, "12");
    const [q] = m.db.of("follows");
    expect(q.has("delete")).toBe(true);
    expect(q.args("eq")).toEqual(["id", "12"]);
    expect(m.log).toHaveBeenCalledWith(ADMIN, "delete_follow", USER, "user", {
      follow_id: "12",
    });
  });

  it("retire une amitié, erreur rendue si la base refuse", async () => {
    rows.friendships = () => ({ error: { message: "panne" } });
    expect(await deleteFriendship(ADMIN, USER, "7")).toEqual({
      status: 500,
      error: "panne",
    });
    expect(m.db.of("friendships")[0].args("eq")).toEqual(["id", "7"]);
  });
});
