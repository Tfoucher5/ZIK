import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeQuery } from "../../__tests__/fakeQuery.js";

const m = vi.hoisted(() => ({ db: null, log: null, cancel: null }));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));
vi.mock("../../pro.js", () => ({
  cancelSubscriptions: (...a) => m.cancel(...a),
}));
vi.mock("../../../middleware/auth.js", () => ({
  logAdminAction: (...a) => m.log(...a),
}));

const { deleteUserAccount } = await import("../userActions.js");

const ADMIN = "admin-1";
const USER = "user-1";
let rows;

beforeEach(() => {
  rows = {};
  m.log = vi.fn(async () => {});
  m.cancel = vi.fn(async () => {});
  m.db = fakeQuery((q) => rows[q.table]?.(q));
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
    expect(m.cancel).toHaveBeenCalledWith(USER);
    expect(m.db.client.auth.admin.deleteUser).toHaveBeenCalledWith(USER);
    expect(m.log).toHaveBeenCalledWith(ADMIN, "delete_user", USER, "user", {
      username: "lea",
    });
  });

  it("abonnement Stripe non résilié : compte gardé, erreur 500, pas de journal", async () => {
    rows.profiles = () => ({ data: { username: "lea" } });
    m.cancel.mockRejectedValueOnce(new Error("stripe ko"));
    expect(await deleteUserAccount(ADMIN, USER, "lea")).toEqual({
      status: 500,
      error: "Abonnement Stripe non résilié : stripe ko",
    });
    expect(m.db.client.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(m.log).not.toHaveBeenCalled();
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

  it("profil absent et confirmation vide : rien n'est supprimé", async () => {
    rows.profiles = () => ({ data: null, error: { message: "0 rows" } });
    const res = await deleteUserAccount(ADMIN, USER, undefined);
    expect(m.db.client.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(res?.status).toBe(400);
  });
});
