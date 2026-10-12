/**
 * Kinjy service worker — notifications only.
 *
 * Deliberately not a caching worker. A service worker that caches is a second
 * deployment system with its own version of the site, and the failure mode is
 * a member stuck on last week's build with no way to say so. This one handles
 * two events and nothing else.
 *
 * It is the only part of Kinjy that runs when the tab is closed, so it is kept
 * small enough to read in one sitting.
 */

// Take over as soon as a new version is installed, rather than waiting for
// every tab to close. A worker a month out of date handling today's pushes is
// the thing this avoids.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  // A push with no data, or data that is not ours, still deserves something:
  // the browser shows its own "This site has been updated in the background"
  // if nothing is displayed, which is worse than a plain line from us.
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const title = payload.title || 'Kinjy'
  const options = {
    body: payload.body || '',
    icon: '/logo-192.png',
    badge: '/badge-72.png',
    // `tag` collapses repeats: ten messages in one thread replace each other
    // rather than stacking ten notifications somebody has to dismiss.
    tag: payload.tag || payload.kind || 'kinjy',
    renotify: true,
    data: { link: payload.link || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/'

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Reuse a tab that is already open rather than adding another: somebody
      // who taps six notifications should not end up with six Kinjy tabs.
      for (const client of windows) {
        if (client.url.includes(self.location.origin)) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(link)
            } catch {
              /* a cross-origin or failed navigate still leaves them focused */
            }
          }
          return
        }
      }
      await self.clients.openWindow(link)
    })(),
  )
})
