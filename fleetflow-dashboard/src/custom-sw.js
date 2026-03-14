importScripts('./ngsw-worker.js');

self.addEventListener('notificationclick', function (event) {

  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function (clientList) {

      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        console.log('Opening new window for URL:', url);
        return clients.openWindow(url);
      }

    })
  );

});