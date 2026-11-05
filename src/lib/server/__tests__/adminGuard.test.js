import { describe, it, expect, vi, afterEach } from "vitest";
import { createHmac } from "node:crypto";

vi.stubEnv("SUPABASE_SERVICE_KEY", "cle-de-test");

vi.mock("../config.js", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
    }),
  },
  getAdminClient: () => ({
    from: () => ({
      insert: () => ({ then: () => {} }),
    }),
  }),
}));

const { handle } = await import("../../../hooks.server.js");
const { makeAdminToken, readAdminToken, ADMIN_COOKIE } =
  await import("../maintenance.js");
const { adminActions, requireAdmin } =
  await import("../middleware/adminActions.js");

const REGLAGES = "/(admin)/admin/reglages";

function appel(chemin, routeId, { method = "GET", data = false, cookie } = {}) {
  const event = {
    url: new URL(`https://zik.test${chemin}`),
    route: { id: routeId },
    isDataRequest: data,
    locals: {},
    request: new Request(`https://zik.test/`, { method }),
    // Le cookie de provenance est déjà posé : pas d'écriture de visite ici
    cookies: {
      get: (nom) =>
        nom === ADMIN_COOKIE ? cookie : nom === "zik_src" ? "1" : undefined,
      set: () => {},
    },
  };
  const resolve = vi.fn(async () => new Response("page"));
  return handle({ event, resolve }).then((res) => ({ res, resolve }));
}

describe("garde des routes admin", () => {
  // Le routeur décode le chemin, pas event.url.pathname : ces adresses mènent
  // toutes à la route admin alors que leur texte ne commence pas par /admin
  const ENCODES = [
    "/admin/reglages",
    "/%61dmin/reglages",
    "/%61%64%6d%69%6e/reglages",
    "/admin/%72eglages",
  ];

  it.each(ENCODES)("anonyme, action sur %s : refusée", async (chemin) => {
    const { res, resolve } = await appel(`${chemin}?/maintenance`, REGLAGES, {
      method: "POST",
    });
    expect(res.status).toBe(403);
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each(ENCODES)("anonyme, page %s : vers la connexion", async (chemin) => {
    const { res, resolve } = await appel(chemin, REGLAGES);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/admin/connexion?next=");
    expect(resolve).not.toHaveBeenCalled();
  });

  // SvelteKit retire __data.json de url.pathname avant handle
  it.each(ENCODES)(
    "anonyme, données de %s : rien, redirection",
    async (chemin) => {
      const { res, resolve } = await appel(chemin, REGLAGES, { data: true });
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toContain("/admin/connexion?next=");
      expect(await res.text()).toBe("");
      expect(resolve).not.toHaveBeenCalled();
    },
  );

  it("anonyme, route +server.js du groupe admin : refusée", async () => {
    const { res, resolve } = await appel(
      "/%61dmin/salons/chat",
      "/(admin)/admin/salons/chat",
      { method: "POST" },
    );
    expect(res.status).toBe(403);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("un cookie admin falsifié ne passe pas", async () => {
    const { res, resolve } = await appel("/%61dmin/reglages", REGLAGES, {
      cookie: `${Date.now() + 60000}.u1.faux`,
    });
    expect(res.status).toBe(303);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("la page de connexion reste ouverte", async () => {
    const route = "/(admin)/admin/connexion";
    expect((await appel("/admin/connexion", route)).res.status).toBe(200);
    const donnees = await appel("/admin/connexion", route, { data: true });
    expect(donnees.res.status).toBe(200);
  });

  it("un admin connecté passe, ses actions aussi", async () => {
    const cookie = makeAdminToken("u1");
    for (const options of [{}, { method: "POST" }, { data: true }]) {
      const { res, resolve } = await appel("/admin/reglages", REGLAGES, {
        ...options,
        cookie,
      });
      expect(res.status).toBe(200);
      expect(resolve).toHaveBeenCalledOnce();
    }
  });

  it("les pages publiques et les adresses inconnues ne sont pas concernées", async () => {
    expect((await appel("/salon", "/(site)/salon")).res.status).toBe(200);
    expect((await appel("/inconnue", null)).res.status).toBe(200);
  });
});

describe("cookie admin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("SUPABASE_SERVICE_KEY", "cle-de-test");
  });

  function signe(secret) {
    const exp = Date.now() + 60000;
    const sig = createHmac("sha256", secret)
      .update(`admin:${exp}:u1`)
      .digest("hex")
      .slice(0, 32);
    return `${exp}.u1.${sig}`;
  }

  async function refuse(cookie) {
    expect(readAdminToken(cookie)).toBeNull();
    const { res, resolve } = await appel("/admin/reglages", REGLAGES, {
      cookie,
    });
    expect(res.status).toBe(303);
    expect(resolve).not.toHaveBeenCalled();
  }

  it("cookie valide : l'admin est reconnu", () => {
    expect(readAdminToken(makeAdminToken("u1"))).toBe("u1");
  });

  it.each([undefined, ""])(
    "secret à %j : personne n'est admin, le hook ne lève pas",
    async (valeur) => {
      const cookie = makeAdminToken("u1");
      vi.stubEnv("SUPABASE_SERVICE_KEY", valeur);
      await refuse(cookie);
      await refuse(signe(""));
    },
  );

  it("sans secret, seule la clé de service signe : ni clé anonyme ni valeur fixe", async () => {
    vi.stubEnv("SUPABASE_SERVICE_KEY", undefined);
    await refuse(signe(process.env.SUPABASE_ANON_KEY));
    vi.stubEnv("SUPABASE_ANON_KEY", undefined);
    await refuse(signe("zik"));
  });

  it("signature en caractères multi-octets : refusée sans erreur", async () => {
    await refuse(`${Date.now() + 60000}.u1.${"é".repeat(32)}`);
  });

  it("un cookie signé avec un autre secret ne passe pas", () => {
    const cookie = makeAdminToken("u1");
    vi.stubEnv("SUPABASE_SERVICE_KEY", "autre-cle");
    expect(readAdminToken(cookie)).toBeNull();
  });
});

describe("second contrôle admin", () => {
  it("action sans admin : 403, l'action ne tourne pas", () => {
    const action = vi.fn();
    const { go } = adminActions({ go: action });
    expect(() => go({ locals: {} })).toThrow(
      expect.objectContaining({ status: 403 }),
    );
    expect(action).not.toHaveBeenCalled();
  });

  it("action d'un admin : l'événement passe, le résultat revient", () => {
    const event = { locals: { adminId: "u1" } };
    const action = vi.fn(() => "fait");
    expect(adminActions({ go: action }).go(event)).toBe("fait");
    expect(action).toHaveBeenCalledWith(event);
  });

  it("requireAdmin refuse un adminId vide", () => {
    expect(() => requireAdmin({ adminId: null })).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });
});

describe("journal d'accès admin", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("note la route et l'admin, jamais la query string", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const route = "/(admin)/admin/journal";
    await appel("/admin/journal?token=secret", route, {
      cookie: makeAdminToken("u1"),
    });
    await appel("/admin/journal?token=secret", route);
    expect(info.mock.calls.flat()).toEqual([
      `[admin-acces] GET ${route} admin=u1`,
      `[admin-acces] GET ${route} admin=aucun`,
    ]);
  });

  it("requêtes sans session admin : une ligne par minute, quelle que soit la méthode", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const route = "/(admin)/admin/argent";
    await appel("/admin/argent", route, { method: "POST" });
    await appel("/admin/argent", route, { method: "POST" });
    expect(info).toHaveBeenCalledOnce();
  });

  it("un GET par minute par route, toutes les écritures", async () => {
    vi.useFakeTimers();
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const route = "/(admin)/admin/salons/chat";
    const cookie = makeAdminToken("u1");
    await appel("/admin/salons/chat", route, { cookie });
    await appel("/admin/salons/chat", route, { cookie });
    expect(info).toHaveBeenCalledTimes(1);
    await appel("/admin/salons/chat", route, { cookie, method: "POST" });
    await appel("/admin/salons/chat", route, { cookie, method: "POST" });
    expect(info).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(61_000);
    await appel("/admin/salons/chat", route, { cookie });
    expect(info).toHaveBeenCalledTimes(4);
  });

  it("ignore la connexion, le public et les GET de /api/admin", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await appel("/admin/connexion", "/(admin)/admin/connexion");
    await appel("/salon", "/(site)/salon");
    await appel("/api/admin/pulse", "/(site)/api/admin/pulse");
    expect(info).not.toHaveBeenCalled();
  });

  it("note les écritures de /api/admin", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await appel(
      "/api/admin/track-audio-fix",
      "/(site)/api/admin/track-audio-fix",
      {
        method: "POST",
      },
    );
    expect(info).toHaveBeenCalledOnce();
  });
});
