// Calculs de distance et de cercles. Aucune dépendance au navigateur.

export const DEFAULT_RINGS = [100, 300, 500, 1000];
export const MIN_RING = 100;
const EARTH_R = 6371008.8; // rayon moyen de la Terre, en mètres
/** Vitesse de marche réglable (Réglages → Mon pas, v142) : 2 à 7 km/h, 5 km/h au départ (12 min/km). */
export const WALK_KMH_MIN = 2;
export const WALK_KMH_MAX = 7;
let minPerKm = 12;
/** Règle la vitesse de marche de toute l'appli (km/h, bornée de 2 à 7 ; illisible : 5). */
export function setWalkSpeed(kmh) {
  const k = Number(kmh);
  minPerKm = 60 / (Number.isFinite(k) && k > 0 ? Math.min(WALK_KMH_MAX, Math.max(WALK_KMH_MIN, k)) : 5);
}
/** Minutes de marche par mètre à vol d'oiseau, détours compris (pour les calculs de balade). */
export const walkMinPerM = () => (minPerKm / 1000) * DETOUR;
// À Paris, le trajet à pied réel est en moyenne 1,2 à 1,4 fois plus long que la ligne droite.
export const DETOUR = 1.3;
/** Sous 1 km à vol d'oiseau, on va à pied (lien Google Maps, et page Métro quand aucun métro n'est trouvé, v211). */
export const WALK_LIMIT_M = 1000;
/** Y aller (v214) : la limite « à pied » se règle (Réglages → Distances et durées). La page Métro garde 1 km. */
let walkLimit = WALK_LIMIT_M;
export const setWalkLimit = (m = WALK_LIMIT_M) => { walkLimit = Number.isFinite(m) && m > 0 ? m : WALK_LIMIT_M; };

/** Distance à vol d'oiseau en mètres entre deux positions {lat, lng}. */
export function distanceM(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Minutes de marche pour un chemin déjà mesuré dans les rues (circuits, v166) : sans détour ajouté. 1 minute au minimum. */
export function routeMinutes(m) {
  return Math.max(1, Math.round((m / 1000) * minPerKm));
}

/** Au-delà de 3 h de marche, une durée à pied ne veut plus rien dire (téléphone loin de Paris, v217) : on écrit la distance. */
export const FAR_WALK_MIN = 180;
/** Une distance sans durée : « 770 m », « 7,6 km », « 385 km » (au-delà de 10 km, au km près). */
export function distText(m) {
  if (m < 1000) return `${Math.ceil(m / 10) * 10} m`;
  return `${m >= 10000 ? Math.round(m / 1000).toLocaleString('fr-FR') : (m / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Une durée en minutes, écrite comme on la dit : « 45 min », puis en heures dès 60 min : « 1 h », « 1 h 05 », « 2 h 37 »
 *  (à la minute près, rien d'arrondi ; v498, ma demande du 25 nov.). Une valeur qui n'est pas un nombre reste telle quelle. */
export function durText(n) {
  if (!Number.isFinite(n)) return `${n} min`;
  const v = Math.round(n);
  if (v < 60) return `${v} min`;
  const h = Math.floor(v / 60); const mn = v % 60;
  return `${h} h${mn ? ` ${String(mn).padStart(2, '0')}` : ''}`;
}

/** Depuis ma position : la durée seule jusqu'à 1 km (« 12 min »), puis la distance et la durée (« 9,1 km · 1 h 57 »)
 *  (v499, ma demande du 25 nov.). `nb` : espaces insécables dans chaque morceau, pour une petite ligne de liste. */
export function walkWhen(m, nb = false) {
  const keep = (t) => (nb ? t.replace(/ /g, '\u00a0') : t);
  const t = keep(durText(walkMinutes(m)));
  return m >= 1000 ? `${keep(distText(m))} · ${t}` : t;
}

/** « ≈ 12 min à pied », « ≈ 1 h 10 à pied », ou « à 385 km » quand la marche dépasserait 3 h. */
export function walkLabel(m) {
  const min = walkMinutes(m);
  if (min <= FAR_WALK_MIN) return `≈ ${durText(min)} à pied`;
  return `à ${distText(m)}`;
}

/** Minutes de marche estimées depuis une distance à vol d'oiseau, détours compris. 1 minute au minimum. */
export function walkMinutes(m) {
  return Math.max(1, Math.ceil((m * DETOUR / 1000) * minPerKm - 1e-9));
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
    const d = placeDistM(here, point); // v405 : une rue d'intérêt, jusqu'au point de la rue le plus proche
    const g = groups.find((x) => d <= x.ring);
    if (g) g.items.push({ point, d });
  }
  // Dans chaque cercle, un favori passe devant un lieu jusqu'à `favBonus` mètres plus proche
  const key = (x) => x.d - (x.point.fav ? favBonus : 0);
  for (const g of groups) g.items.sort((x, y) => key(x) - key(y));
  return groups;
}

/** Lien d'itinéraire Google Maps : à pied sous la limite (1 km au départ), en transports au-delà.
 *  Distance inconnue : passe Infinity (transports). À pied imposé (une station toute proche) : passe 0. */
/** Y aller ouvre Google Maps à pied sous la limite réglée, en transports au-delà (v214). La plaque suit la même limite (v231). */
export const walkGo = (d, limit = walkLimit) => d < limit;

export function mapsUrl(point, d, limit = walkLimit) {
  const mode = walkGo(d, limit) ? 'walking' : 'transit';
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=${mode}`;
}

/** Page du lieu dans Google Maps (note et avis), cherchée par son nom et son adresse. Rien n'est envoyé tant qu'on n'appuie pas. */
export function reviewsUrl(p) {
  const q = [p.name, p.address || 'Paris'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Petite ligne d'« Avis Google » sur la fiche (v266, mon choix A du 20 nov.) : pour un resto, elle dit qu'on peut y réserver,
 *  « si le resto le propose » : l'appli ne sait pas si un resto prend les réservations, Google le montre seulement quand c'est possible.
 *  Un resto = la catégorie Restos de départ, ou une catégorie dont le nom parle de repas. */
export const isRestoCat = (c) => c?.id === 'resto' || /resto|restau|bistro|brasser|cantine|cr[eê]per|pizz|tables?\b/i.test(c?.name ?? '');
export const reviewsSub = (c) => (isRestoCat(c) ? 'Avis, et réserver si le resto le propose' : 'Note et avis, dans Google Maps');

/** Lien universel Uber : ouvre l'appli Uber avec la destination remplie ; le départ est la position que l'appli Uber prend elle-même.
 *  Ma carte de Paris n'envoie rien : seul l'appui transmet à Uber le lieu de destination. */
export function uberUrl(p) {
  const e = encodeURIComponent;
  const q = ['action=setPickup', 'pickup=my_location', `dropoff[latitude]=${p.lat.toFixed(6)}`, `dropoff[longitude]=${p.lng.toFixed(6)}`, `dropoff[nickname]=${e(p.name)}`];
  if (p.address) q.push(`dropoff[formatted_address]=${e(p.address)}`);
  return `https://m.uber.com/ul/?${q.join('&')}`;
}

// Cercles en minutes à pied : même règle que walkMinutes (mon pas, trajet 1,3 fois la ligne droite).
export const DEFAULT_MINUTE_RINGS = [5, 10, 15, 20];

/** Rayon à vol d'oiseau (m) correspondant à `min` minutes de marche. */
export function minutesToMeters(min) {
  return Math.floor(min * 1000 / (minPerKm * DETOUR)); // ≈ 64 m par minute à 5 km/h ; arrondi vers le bas : le cercle « 5 min » reste à 5 min ou moins
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

/** v403 : la longueur d'un tracé [[lat, lng], …] (une rue d'intérêt), en mètres ; 0 sans tracé. */
export function lineLengthM(line) {
  if (!Array.isArray(line)) return 0;
  let m = 0;
  for (let i = 1; i < line.length; i++) m += distanceM({ lat: line[i - 1][0], lng: line[i - 1][1] }, { lat: line[i][0], lng: line[i][1] });
  return m;
}

/** v404-v405 : le point d'un tracé le plus proche de `pt`, et sa distance ({ lat, lng, d }) ; null sans tracé.
 *  Calcul à plat autour de `pt` (assez juste à l'échelle d'une rue de Paris). */
export function nearestOnLine(line, pt) {
  if (!Array.isArray(line) || line.length < 2 || !Number.isFinite(pt?.lat) || !Number.isFinite(pt?.lng)) return null;
  const KY = 111_320; const KX = KY * Math.cos((pt.lat * Math.PI) / 180);
  let best = null;
  for (let i = 1; i < line.length; i++) {
    const ax = (line[i - 1][1] - pt.lng) * KX; const ay = (line[i - 1][0] - pt.lat) * KY;
    const bx = (line[i][1] - pt.lng) * KX; const by = (line[i][0] - pt.lat) * KY;
    const dx = bx - ax; const dy = by - ay; const L2 = dx * dx + dy * dy;
    const u = L2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2)) : 0;
    const x = ax + u * dx; const y = ay + u * dy;
    const lat = pt.lat + y / KY; const lng = pt.lng + x / KX;
    const d = distanceM(pt, { lat, lng });
    if (!best || d < best.d) best = { lat, lng, d };
  }
  return best;
}

/** v404 (mon choix 2 du 24 nov.), v407 (mon choix A) : où va « Y aller » d'un de mes lieux. Une rue d'intérêt : le point de la rue
 *  le plus proche de moi (v404 visait le bout le plus proche : la fiche disait 300 m quand Autour de moi disait 100 m) ;
 *  un autre lieu, ou sans position : sa goutte. */
export function goTarget(p, pos) {
  if (!p?.line || p.line.length < 2 || !Number.isFinite(pos?.lat)) return p;
  const near = nearestOnLine(p.line, pos);
  return near ? { ...p, lat: near.lat, lng: near.lng } : p;
}

/** v405 (mon choix 3 du 24 nov.) : la distance d'un de mes lieux pour les listes. Une rue d'intérêt : jusqu'au point de la rue
 *  le plus proche (sur la rue : « à côté »), plus jusqu'à sa goutte au milieu ; un autre lieu : jusqu'à sa goutte. */
export function placeDistM(from, p) {
  if (p?.line) { const n = nearestOnLine(p.line, from); if (n) return n.d; }
  return distanceM(from, p);
}
