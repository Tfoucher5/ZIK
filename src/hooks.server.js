import { getMaintenance, maintenanceHtml } from "$lib/server/maintenance.js";

const MAINTENANCE_EXEMPT = ["/admin", "/api/admin"];

export async function handle({ event, resolve }) {
  const path = event.url.pathname;

  const exempt = MAINTENANCE_EXEMPT.some((p) => path.startsWith(p));
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

  const response = await resolve(event);
  // Empêche les iframes (YouTube) d'accéder à l'API Media Session
  // → le titre de la chanson ne peut plus apparaître dans les contrôles système iOS/Android
  response.headers.set("Permissions-Policy", "mediasession=(self)");
  return response;
}
