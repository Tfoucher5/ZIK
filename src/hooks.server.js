import {
  getMaintenance,
  maintenanceHtml,
  isValidBypassToken,
  BYPASS_COOKIE,
} from "$lib/server/maintenance.js";
import { getAdminClient } from "$lib/server/config.js";
import { isTrackableVisit, buildVisitRow } from "$lib/server/visitSource.js";

const MAINTENANCE_EXEMPT = ["/admin", "/api/admin", "/api/stripe"];

// Pages privées : jamais indexées. On le dit par en-tête plutôt que dans
// robots.txt, qui est public et révélerait leur existence à tout le monde.
const PRIVATE_PATHS = [
  "/admin",
  "/api",
  "/salon/host",
  "/salon/regie",
  "/settings",
];

const VISIT_COOKIE = "zik_src";
const VISIT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Enregistre la provenance d'un visiteur, une seule fois par navigateur.
// Le cookie ne porte qu'un drapeau : il sert à ne pas recompter la même
// personne à chaque page, pas à l'identifier.
function recordVisitSource(event) {
  if (event.cookies.get(VISIT_COOKIE)) return;

  const trackable = isTrackableVisit({
    method: event.request.method,
    pathname: event.url.pathname,
    userAgent: event.request.headers.get("user-agent"),
    accept: event.request.headers.get("accept"),
  });
  if (!trackable) return;

  event.cookies.set(VISIT_COOKIE, "1", {
    path: "/",
    maxAge: VISIT_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: event.url.protocol === "https:",
  });

  try {
    getAdminClient()
      .from("visit_sources")
      .insert(buildVisitRow(event))
      .then(({ error }) => {
        if (error) console.error("[visit_sources]", error.message);
      });
  } catch (err) {
    console.error("[visit_sources]", err.message);
  }
}

export async function handle({ event, resolve }) {
  const path = event.url.pathname;

  const exempt =
    MAINTENANCE_EXEMPT.some((p) => path.startsWith(p)) ||
    isValidBypassToken(event.cookies.get(BYPASS_COOKIE));
  if (!exempt) {
    const maintenance = await getMaintenance();
    if (maintenance?.enabled) {
      return new Response(maintenanceHtml(maintenance.message), {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "600",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  recordVisitSource(event);

  const response = await resolve(event);
  // Empêche les iframes (YouTube) d'accéder à l'API Media Session
  // → le titre de la chanson ne peut plus apparaître dans les contrôles système iOS/Android
  response.headers.set("Permissions-Policy", "mediasession=(self)");
  if (PRIVATE_PATHS.some((p) => path === p || path.startsWith(p + "/")))
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
