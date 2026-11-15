// Garde l'appli elle-même en cache pour qu'elle s'ouvre vite.
// Les fonds de carte et la recherche d'adresses passent toujours par internet.
const CACHE = 'carte-paris-v2';
const FILES = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/geo.js', 'js/store.js', 'js/adresse.js', 'js/search.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Réseau d'abord (pour avoir la dernière version), cache si pas de réseau.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
