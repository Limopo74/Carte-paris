// Calculs de distance et de cercles. Aucune dépendance au navigateur.

export const DEFAULT_RINGS = [100, 300, 500, 1000];
export const MIN_RING = 100;
const EARTH_R = 6371008.8; // rayon moyen de la Terre, en mètres
const MIN_PER_KM = 12; // environ 5 km/h
// À Paris, le trajet à pied réel est en moyenne 1,2 à 1,4 fois plus long que la ligne droite.
const DETOUR = 1.3;
const WALK_LIMIT_M = 1000;

/** Distance à vol d'oiseau en mètres entre deux positions {lat, lng}. */
export function distanceM(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Minutes de marche estimées depuis une distance à vol d'oiseau, détours compris. 1 minute au minimum. */
export function walkMinutes(m) {
  return Math.max(1, Math.ceil((m * DETOUR / 1000) * MIN_PER_KM - 1e-9));
}

/**
 * Remet en ordre une liste de cercles saisie librement (tableau ou texte
 * séparé par des virgules) : nombres entiers, 100 m au minimum, triés, sans doublon.
 */
export function normalizeRings(input) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(/[,;\s]+/);
  const vals = raw
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.max(MIN_RING, Math.round(n)));
  const uniq = [...new Set(vals)].sort((x, y) => x - y);
  return uniq.length ? uniq : [...DEFAULT_RINGS];
}

/**
 * Range les points dans les cercles autour de `here`.
 * Un point à exactement R mètres va dans le cercle R. Les points au-delà
 * du dernier cercle ne sont pas renvoyés.
 */
export function groupByRings(points, here, rings, { favBonus = 0 } = {}) {
  const groups = rings.map((ring) => ({ ring, items: [] }));
  for (const point of points) {
    const d = distanceM(here, point);
    const g = groups.find((x) => d <= x.ring);
    if (g) g.items.push({ point, d });
  }
  // Dans chaque cercle, un favori passe devant un lieu jusqu'à `favBonus` mètres plus proche
  const key = (x) => x.d - (x.point.fav ? favBonus : 0);
  for (const g of groups) g.items.sort((x, y) => key(x) - key(y));
  return groups;
}

/** Lien d'itinéraire Google Maps : à pied sous 1 km, en transports au-delà. */
export function mapsUrl(point, d) {
  const mode = d < WALK_LIMIT_M ? 'walking' : 'transit';
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=${mode}`;
}

/** Page du lieu dans Google Maps (note et avis), cherchée par son nom et son adresse. Rien n'est envoyé tant qu'on n'appuie pas. */
export function reviewsUrl(p) {
  const q = [p.name, p.address || 'Paris'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Lien universel Uber : ouvre l'appli Uber avec la destination remplie ; le départ est la position que l'appli Uber prend elle-même.
 *  Ma carte de Paris n'envoie rien : seul l'appui transmet à Uber le lieu de destination. */
export function uberUrl(p) {
  const e = encodeURIComponent;
  const q = ['action=setPickup', 'pickup=my_location', `dropoff[latitude]=${p.lat.toFixed(6)}`, `dropoff[longitude]=${p.lng.toFixed(6)}`, `dropoff[nickname]=${e(p.name)}`];
  if (p.address) q.push(`dropoff[formatted_address]=${e(p.address)}`);
  return `https://m.uber.com/ul/?${q.join('&')}`;
}

// Cercles en minutes à pied : même règle que walkMinutes (12 min/km, trajet 1,3 fois la ligne droite).
export const DEFAULT_MINUTE_RINGS = [5, 10, 15, 20];
const M_PER_MIN = 1000 / (MIN_PER_KM * DETOUR); // ≈ 64 m à vol d'oiseau par minute de marche

/** Rayon à vol d'oiseau (m) correspondant à `min` minutes de marche. */
export function minutesToMeters(min) {
  return Math.floor(min * M_PER_MIN); // arrondi vers le bas : le cercle « 5 min » reste à 5 min ou moins
}

/** Cercles en minutes saisis librement : entiers de 1 à 60, triés, sans doublon. */
export function normalizeMinuteRings(input) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(/[,;\s]+/);
  const vals = raw.map((v) => Math.round(Number(String(v).trim())))
    .filter((n) => Number.isFinite(n) && n >= 1)
    .map((n) => Math.min(60, n));
  const uniq = [...new Set(vals)].sort((a, b) => a - b);
  return uniq.length ? uniq : [...DEFAULT_MINUTE_RINGS];
}
