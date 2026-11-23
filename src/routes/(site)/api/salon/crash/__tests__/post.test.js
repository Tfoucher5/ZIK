import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { POST } = await import("../+server.js");

const nominal = { ecran: "regie", code: "XYZ789", essai: 1, message: "boum" };
let ipN = 0;
const envoyer = (body, from = `10.1.0.${++ipN}`) =>
  POST({
    request: new Request("http://x/api/salon/crash", {
      method: "POST",
      headers: { "x-forwarded-for": from, "user-agent": "UA" },
      body,
    }),
  });

let errSpy;
beforeEach(() => {
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

describe("POST /api/salon/crash", () => {
  it("cas nominal : 204 et une ligne au journal", async () => {
    const res = await envoyer(JSON.stringify(nominal));
    expect(res.status).toBe(204);
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(errSpy.mock.calls[0][0]).toMatch(
      /^\[ecran-salon\] regie XYZ789 essai 1 : boum\n/,
    );
  });

  it.each([
    ["non-JSON", "pas du json{"],
    ["vide", ""],
    ["tableau", JSON.stringify([nominal])],
    ["mauvais type", JSON.stringify({ ...nominal, essai: "1" })],
  ])("%s : 400, rien d'écrit", async (_, body) => {
    const res = await envoyer(body);
    expect(res.status).toBe(400);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it("au-delà de 6 par minute depuis une IP : 429", async () => {
    const from = "10.2.0.1";
    for (let i = 0; i < 6; i++)
      expect((await envoyer(JSON.stringify(nominal), from)).status).toBe(204);
    await expect(envoyer(JSON.stringify(nominal), from)).rejects.toMatchObject({
      status: 429,
    });
  });
});
