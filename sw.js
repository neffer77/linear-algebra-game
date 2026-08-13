/*
 * Service worker for Knights of the Eigenrealm.
 *
 * Two jobs, in order of importance:
 *
 *   1. Make the site installable, so it can be added to the home screen.
 *      That is not a cosmetic nicety — Safari deletes a site's local storage
 *      after about a week without a visit, and a home-screen web app is not
 *      subject to that. Installing is what stops a knight quietly vanishing.
 *   2. Play offline, which the game is already capable of; it just needed
 *      its one file to be there.
 *
 * VERSION is rewritten with the commit SHA when the site is built, so every
 * deploy produces a byte-different worker. That is what makes the browser
 * notice there is a new version at all — an identical file is ignored, and
 * players would sit on a stale build forever.
 */
const VERSION = 'dev';
const CACHE = 'eigenrealm-' + VERSION;

// The whole game is index.html; everything else here is chrome around it.
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // One missing file must not fail the whole install, or a typo in this
      // list would leave players with no worker and no offline play at all.
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('eigenrealm-') && k !== CACHE)
            .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Cache first: the game is a single static file, so the cached copy is
  // always correct for the version this worker installed. Freshness is the
  // update flow's job, not this one's.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// The page asks for the new version once the player agrees to reload.
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
