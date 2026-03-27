self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "하루 알람",
    body: "알람 시간입니다.",
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (error) {
    data = {
      title: "하루 알람",
      body: "알람 시간입니다.",
    };
  }

  const title = data.title || "하루 알람";
  const options = {
    body: data.body || "알람 시간입니다.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: data,
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow("/profile.html");
      }
    })
  );
});