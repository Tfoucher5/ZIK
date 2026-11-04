import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../config.js", () => ({ getAdminClient: () => ({}) }));

const { makeProbes } = await import("../probes.js");
const { noteEvent, resetOpsEvents } = await import("../opsEvents.js");

const loop = { enable() {}, reset() {}, percentile: () => 0 };
const sondes = (extra) =>
  makeProbes({
    loop,
    log: [],
    env: {
      SUPABASE_URL: "http://sb.test",
      SUPABASE_ANON_KEY: "cle",
      PORT: "1234",
    },
    ...extra,
  });
const reponse = (status, body = {}) => ({
  status,
  ok: status < 400,
  json: async () => body,
  text: async () => body,
});

beforeEach(resetOpsEvents);

describe("mails", () => {
  const env = { RESEND_API_KEY: "re_x" };
  const resend = (status, data) => async () => reponse(status, { data });

  it("sans clé : rien à signaler hors prod", async () => {
    expect((await sondes({ env: {} }).mail()).detail).toBe("Non configuré");
  });

  it("domaine vérifié : compte les mails du jour", async () => {
    noteEvent("mail_sent");
    noteEvent("mail_sent");
    const p = sondes({
      env,
      fetchFn: resend(200, [{ name: "zik-music.fr", status: "verified" }]),
    });
    expect(await p.mail()).toMatchObject({
      result: "ok",
      detail: "2 envoyés en 24 h",
    });
  });

  it("clé limitée à l'envoi, ou trop d'appels : Resend répond, pas d'alerte", async () => {
    for (const [code, corps] of [
      [401, '{"name":"restricted_api_key"}'],
      [429, '{"name":"rate_limit_exceeded"}'],
    ]) {
      const p = sondes({ env, fetchFn: async () => reponse(code, corps) });
      expect((await p.mail()).result).toBe("ok");
    }
  });

  it("clé invalide ou révoquée : échec", async () => {
    for (const [code, corps] of [
      [401, '{"name":"validation_error"}'],
      [403, '{"name":"restricted_api_key"}'],
    ]) {
      const p = sondes({ env, fetchFn: async () => reponse(code, corps) });
      expect((await p.mail()).result).toBe("fail");
    }
  });

  it("domaine plus vérifié : échec", async () => {
    const p = sondes({
      env,
      fetchFn: resend(200, [{ name: "zik-music.fr", status: "failed" }]),
    });
    expect(await p.mail()).toMatchObject({
      result: "fail",
      detail: "Domaine zik-music.fr : failed",
    });
  });

  it("quota atteint : échec, même si l'API répond", async () => {
    noteEvent("mail_quota");
    const p = sondes({ env, fetchFn: resend(200, []) });
    expect(await p.mail()).toMatchObject({
      result: "fail",
      detail: "Quota Resend atteint : 1 mail refusé en 1 h",
    });
  });

  it("envois en échec : suspicion puis échec", async () => {
    const p = sondes({ env, fetchFn: resend(200, []) });
    noteEvent("mail_failed");
    expect((await p.mail()).result).toBe("warn");
    noteEvent("mail_failed");
    noteEvent("mail_failed");
    expect((await p.mail()).result).toBe("fail");
  });

  it("Resend en panne : échec", async () => {
    const p = sondes({ env, fetchFn: async () => reponse(500, "") });
    expect((await p.mail()).result).toBe("fail");
  });
});
