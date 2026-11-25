// Garde l'appli elle-même en cache pour qu'elle s'ouvre vite.
// Garde aussi les fonds de carte OpenStreetMap déjà regardés, pour le métro sans réseau
// (seulement ce que tu as vu : pas de téléchargement en masse, règle d'usage d'OpenStreetMap).
const CACHE = 'carte-paris-v437';
const TILES = 'carte-paris-tuiles';
const RUES = 'carte-paris-rues'; // plan des rues de Mes parcours : rangé par l'appli elle-même, gardé d'une version à l'autre
const MAX_TILES = 3000; // environ 50 Mo
const FRESH = 7 * 864e5; // une tuile de moins de 7 jours n'est pas redemandée
const FILES = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/geo.js', 'js/mesure-pas.js', 'js/store.js', 'js/adresse.js', 'js/search.js', 'js/annuaire.js', 'js/stats.js', 'js/move.js', 'js/share.js', 'js/pratique.js', 'js/hours.js', 'js/holidays.js', 'js/journal.js', 'js/notes.js', 'js/calendrier.js', 'js/reglages.js', 'js/metroplan.js', 'js/photos.js', 'js/venue-photos.js', 'js/icons.js', 'js/explore.js', 'js/events.js', 'js/markets.js', 'js/usage.js', 'js/art.js', 'js/planning.js', 'js/passage.js', 'js/export-vu.js', 'js/remarques.js', 'js/depart.js', 'js/plaques.js', 'vendor/qrcode.mjs', 'vendor/fonts/archivo-wdth.woff2', 'vendor/fonts/inter-latin-wght.woff2',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'data/stations.json', 'data/lignes.json', 'data/sanitaires-ratp.json', 'js/donnees.js', 'data/navigo.json', 'js/navigo.js', 'data/merimee.json', 'data/musees.json', 'js/ttb.js', 'data/arrondissements.json', 'js/calques.js', 'js/bus.js', 'js/buslines.js', 'js/soleil.js', 'js/respire.js', 'js/voies.js', 'js/architectes.js', 'js/patrimoine.js', 'js/acces.js', 'js/gares.js', 'js/circuits.js', 'js/passages.js', 'js/groupes.js', 'js/lieu-ouvert.js', 'js/hauteurs.js', 'js/nouvelle-version.js', 'js/parcours.js', 'js/typo.js', 'js/chezmoi.js', 'js/mots.js', 'js/rues.js', 'js/rues-calque.js', 'js/mescircuits.js', 'js/jardins.js', 'js/velo.js', 'js/baguettes.js', 'js/reperes.js', 'js/zoom-doigt.js', 'js/noms.js', 'data/circuits.json', 'data/passages.json', 'data/oeuvres.json', 'data/galeries.json', 'data/bus.json', 'data/gares.json', 'data/acces.json', 'data/respire.json', 'data/acr.json', /* v210 : gardés pour le métro, même juste après une mise à jour */
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== TILES && k !== RUES).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

let puts = 0;
let slowUntil = 0; // réseau trop lent constaté : jusqu'à cette heure, la copie gardée passe d'abord
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
  if (url.hostname === 'tile.openstreetmap.org' || url.hostname === 'basemaps.cartocdn.com' || (url.hostname === 'data.geopf.fr' && url.pathname === '/wmts')) { e.respondWith(tile(e.request)); return; } // v382 : tuiles de l'IGN regardées, gardées comme les autres
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/data/rues.json')) return; // plan des rues : téléchargé une fois par l'appli, rangé à part (pas de copie en double ici)
  // Réseau d'abord (pour avoir la dernière version). Si le réseau ne répond pas en 3 s (métro, quai), la copie gardée ;
  // la réponse du réseau, si elle finit par arriver, met la copie à jour pour la prochaine ouverture.
  const net = fetch(e.request, { cache: 'no-cache' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  e.respondWith(new Promise((resolve) => {
    let done = false;
    const give = (r) => { if (r && !done) { done = true; resolve(r); } };
    // Réseau déjà jugé trop lent il y a moins de 30 s : copie gardée tout de suite (sinon 3 s par niveau de modules).
    if (Date.now() < slowUntil) caches.match(e.request).then(give);
    const timer = setTimeout(() => { slowUntil = Date.now() + 30000; caches.match(e.request).then(give); }, 3000);
    net.then((res) => { clearTimeout(timer); give(res); })
      .catch(() => { clearTimeout(timer); caches.match(e.request).then((r) => r || caches.match('index.html')).then((r) => give(r || Response.error())); });
  }));
});
