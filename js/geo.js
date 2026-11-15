// Calculs de distance et de cercles. Aucune dépendance au navigateur.

export const DEFAULT_RINGS = [100, 300, 500, 1000];
export const MIN_RING = 100;
const EARTH_R = 6371008.8; // rayon moyen de la Terre, en mètres
const MIN_PER_KM = 12;
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

/** Minutes de marche estimées (12 min par km), 1 minute au minimum. */
export function walkMinutes(m) {
  return Math.max(1, Math.ceil((m / 1000) * MIN_PER_KM - 1e-9));
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
export function groupByRings(points, here, rings) {
  const groups = rings.map((ring) => ({ ring, items: [] }));
  for (const point of points) {
    const d = distanceM(here, point);
    const g = groups.find((x) => d <= x.ring);
    if (g) g.items.push({ point, d });
  }
  for (const g of groups) g.items.sort((x, y) => x.d - y.d);
  return groups;
}

/** Lien d'itinéraire Google Maps : à pied sous 1 km, en transports au-delà. */
export function mapsUrl(point, d) {
  const mode = d < WALK_LIMIT_M ? 'walking' : 'transit';
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=${mode}`;
}
