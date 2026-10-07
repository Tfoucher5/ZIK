/// <reference types="@sveltejs/kit" />
// Service worker ZIK : uniquement les notifications d'appareil. Aucun cache,
// le site reste toujours servi en direct par le serveur.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("push", (event) => {
  const msg = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(msg.title || "ZIK", {
      body: msg.body,
      icon: msg.icon || "/favicon/web-app-manifest-192x192.png",
      badge: "/favicon/favicon-96x96.png",
      tag: msg.tag,
      data: { url: msg.url || "/" },
    }),
  );
});

// Clic : réutilise un onglet ZIK ouvert, sinon en ouvre un
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin)
    .href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((tabs) => {
        const tab = tabs.find((t) => t.url.startsWith(self.location.origin));
        if (!tab) return self.clients.openWindow(url);
        // navigate() échoue sur un onglet que ce worker ne contrôle pas encore
        return tab
          .focus()
          .then(() => tab.navigate(url))
          .catch(() => self.clients.openWindow(url));
      }),
  );
});
