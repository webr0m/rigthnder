// Notifications only. Never cache account pages, profiles or private API data.
self.addEventListener('push', (event) => {
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {};
  }
  event.waitUntil(
    self.registration.showNotification('OnlyFachos', {
      body: typeof payload.body === 'string' ? payload.body : 'Tienes novedades en OnlyFachos.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: ['onlyfachos-messages', 'onlyfachos-dates'].includes(payload.tag)
        ? payload.tag
        : 'onlyfachos',
      data: {
        url: '/?open=chats',
        testId: typeof payload.data?.testId === 'string' ? payload.data.testId : undefined,
      },
    }),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows)
        if (new URL(client.url).origin === self.location.origin) {
          const url = new URL(client.url);
          // The promotional one-page site has no app message listener. Open
          // the application before focusing it instead of silently dropping
          // notification clicks on a landing-page tab.
          if (
            !/^\/app\/?$/.test(url.pathname) &&
            !url.searchParams.has('google') &&
            !url.searchParams.has('open')
          ) {
            if (/^\/demo\/?$/.test(url.pathname)) continue;
            await client.navigate('/app?open=chats');
          }
          await client.focus();
          client.postMessage({ type: 'onlyfachos:open-chats' });
          return;
        }
      await self.clients.openWindow('/app?open=chats');
    })(),
  );
});
