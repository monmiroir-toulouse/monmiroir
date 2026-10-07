// ── SERVICE WORKER — Mon Miroir ──

self.addEventListener('install', function(event) {
  console.log('Service Worker installé');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activé');
  return self.clients.claim();
});

// ── RÉCEPTION DES NOTIFICATIONS PUSH ──
self.addEventListener('push', function(event) {
  var data = { title: 'Mon Miroir', body: 'Tu as un rendez-vous.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data = { title: 'Mon Miroir', body: event.data.text() };
    }
  }
  
  var options = {
    body: data.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── CLIC SUR LA NOTIFICATION ──
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  var url = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
