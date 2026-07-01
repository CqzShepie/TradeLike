self.addEventListener("push", event => {
  const data = event.data?.json?.() ?? {};
  const title = data.title ?? data.notification?.title ?? "TradeLike";
  const body = data.body ?? data.notification?.body ?? "You have a new update.";
  const url = data.url ?? data.data?.url ?? "/dashboard";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
      icon: "/favicon.svg",
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      const existing = clients.find(client => client.url.endsWith(url));
      if (existing) {
        return existing.focus();
      }

      return self.clients.openWindow(url);
    })
  );
});
