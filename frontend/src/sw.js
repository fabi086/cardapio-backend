import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Novo Pedido!';
    const options = {
        body: data.body || 'Você tem um novo pedido.',
        icon: data.icon || '/logo.svg',
        badge: '/vite.svg',
        data: { url: data.url || '/admin/orders' },
        vibrate: [200, 100, 200, 100, 200, 100, 200], // Vibration pattern
        actions: [
            { action: 'open', title: 'Ver Pedido' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            const url = event.notification.data.url;

            // Check if window is already open and focus it
            for (const client of clientList) {
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
