// Chrome demande ce fichier avant de précharger le site depuis Google
// (proxy de prefetch privé) : on l'autorise
export function GET() {
  return new Response('[{"user_agent":"prefetch-proxy","fraction":1.0}]', {
    headers: {
      "Content-Type": "application/trafficadvice+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
