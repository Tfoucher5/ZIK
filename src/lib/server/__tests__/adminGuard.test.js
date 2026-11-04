import { describe, it, expect, vi } from "vitest";

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
const { makeAdminToken, ADMIN_COOKIE } = await import("../maintenance.js");

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
