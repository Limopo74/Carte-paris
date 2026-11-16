// Garde l'appli elle-même en cache pour qu'elle s'ouvre vite.
// Garde aussi les fonds de carte OpenStreetMap déjà regardés, pour le métro sans réseau
// (seulement ce que tu as vu : pas de téléchargement en masse, règle d'usage d'OpenStreetMap).
const CACHE = 'carte-paris-v92';
const TILES = 'carte-paris-tuiles';
const MAX_TILES = 3000; // environ 50 Mo
const FRESH = 7 * 864e5; // une tuile de moins de 7 jours n'est pas redemandée
const FILES = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/geo.js', 'js/store.js', 'js/adresse.js', 'js/search.js', 'js/annuaire.js', 'js/stats.js', 'js/move.js', 'js/share.js', 'js/pratique.js', 'js/hours.js', 'js/holidays.js', 'js/journal.js', 'js/metroplan.js', 'js/photos.js', 'js/icons.js', 'js/explore.js', 'js/events.js', 'js/markets.js', 'js/art.js', 'vendor/qrcode.mjs', 'vendor/fonts/archivo-wdth.woff2', 'vendor/fonts/inter-latin-wght.woff2',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'data/stations.json', 'data/lignes.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== TILES).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

let puts = 0;
async function trimTiles(c) {
  const keys = await c.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_TILES))) await c.delete(k); // les plus anciennes d'abord
}
async function tile(req) {
  const c = await caches.open(TILES);
  const hit = await c.match(req.url);
  if (hit && Date.now() - Number(hit.headers.get('x-saved') || 0) < FRESH) return hit;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'cors') {
      const blob = await res.clone().blob();
      await c.put(req.url, new Response(blob, { headers: { 'Content-Type': res.headers.get('Content-Type') || 'image/png', 'x-saved': String(Date.now()) } }));
      if (++puts % 50 === 0) trimTiles(c);
    }
    return res;
  } catch (err) {
    if (hit) return hit; // pas de réseau : la tuile gardée, même ancienne
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname === 'tile.openstreetmap.org' || url.hostname === 'basemaps.cartocdn.com') { e.respondWith(tile(e.request)); return; }
  if (url.origin !== self.location.origin) return;
  // Réseau d'abord (pour avoir la dernière version), cache si pas de réseau.
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
