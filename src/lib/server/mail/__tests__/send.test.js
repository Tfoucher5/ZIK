import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { sendMail } = await import("../send.js");
const { countSince, resetOpsEvents } =
  await import("../../services/health/opsEvents.js");

const HOUR = 60 * 60 * 1000;
const compte = (nom) => countSince(nom, HOUR);
const repond = (status, body = "") =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status })),
  );
const mail = { to: "a@test", subject: "s", text: "t" };

describe("journal des envois de mails", () => {
  beforeEach(() => {
    resetOpsEvents();
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("envoi réussi", async () => {
    repond(200, "{}");
    expect(await sendMail(mail)).toBe(true);
    expect(compte("mail_sent")).toBe(1);
  });

  it.each(["daily_quota_exceeded", "monthly_quota_exceeded"])(
    "%s : compté comme quota",
    async (name) => {
      repond(429, JSON.stringify({ name }));
      expect(await sendMail(mail)).toBe(false);
      expect(compte("mail_quota")).toBe(1);
      expect(compte("mail_failed")).toBe(0);
    },
  );

  it.each([
    [429, "rate_limit_exceeded"],
    [422, "invalid_parameter"],
    [400, "validation_error"],
  ])("%s %s : ni quota ni panne", async (status, name) => {
    repond(status, JSON.stringify({ name }));
    expect(await sendMail(mail)).toBe(false);
    expect(compte("mail_quota")).toBe(0);
    expect(compte("mail_failed")).toBe(0);
  });

  it.each([500, 503, 401, 403])("%s : panne", async (status) => {
    repond(status, "{}");
    expect(await sendMail(mail)).toBe(false);
    expect(compte("mail_failed")).toBe(1);
  });

  it("réseau coupé : panne, et l'erreur remonte à l'appelant comme avant", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("réseau");
      }),
    );
    await expect(sendMail(mail)).rejects.toThrow("réseau");
    expect(compte("mail_failed")).toBe(1);
  });

  it("sans clé : rien n'est compté", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await sendMail(mail)).toBe(false);
    expect(compte("mail_failed")).toBe(0);
  });
});
