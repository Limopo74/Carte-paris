// Recherche de lieux (magasins, restaurants, musées…) dans OpenStreetMap avec Nominatim.
// Règles du service public : pas d'autocomplétion, une requête par seconde au plus.
// On ne cherche donc que quand la personne appuie sur « Chercher ».

const BASE = 'https://nominatim.openstreetmap.org/search';
const PARIS_BOX = '2.22,48.92,2.47,48.80'; // préfère Paris sans exclure le reste
/** Recherche par nom : Paris et les départements limitrophes seulement (92, 93, 94). */
export const ZONE_DEPTS = ['75', '92', '93', '94'];
const ZONE_BOX = '2.14,48.99,2.62,48.68'; // rectangle autour de Paris et de la petite couronne ; le tri par département se fait ensuite
const GAP_MS = 1100;

export function placesUrl(q, { zone = false } = {}) {
  const u = new URL(BASE);
  u.search = new URLSearchParams({
    q, format: 'jsonv2', limit: zone ? '15' : '8', countrycodes: 'fr', addressdetails: '1',
    'accept-language': 'fr', viewbox: zone ? ZONE_BOX : PARIS_BOX, bounded: zone ? '1' : '0', extratags: '1',
  });
  return u.toString();
}

/** « 19 Rue Scribe 75009 Paris » à partir du détail d'adresse renvoyé. */
export function shortAddress(a) {
  if (!a) return '';
  const street = a.road ?? a.pedestrian ?? a.square ?? a.footway ?? a.place ?? '';
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? '';
  return [[a.house_number, street].filter(Boolean).join(' '), a.postcode, city].filter(Boolean).join(' ');
}

const KINDS = {
  shop: {
    clothes: 'Vêtements', shoes: 'Chaussures', bakery: 'Boulangerie', pastry: 'Pâtisserie', books: 'Librairie',
    supermarket: 'Supermarché', convenience: 'Épicerie', department_store: 'Grand magasin', cosmetics: 'Cosmétiques',
    perfumery: 'Parfumerie', chocolate: 'Chocolatier', wine: 'Caviste', cheese: 'Fromagerie', florist: 'Fleuriste',
    electronics: 'Électronique', mobile_phone: 'Téléphonie', jewelry: 'Bijouterie', optician: 'Opticien',
    gift: 'Cadeaux', toys: 'Jouets', sports: 'Sport', furniture: 'Meubles', hairdresser: 'Coiffeur',
    beauty: 'Institut de beauté', deli: 'Traiteur', tea: 'Thé', coffee: 'Café (boutique)', bag: 'Maroquinerie',
    second_hand: 'Seconde main', music: 'Disques', art: 'Galerie', stationery: 'Papeterie', mall: 'Centre commercial',
  },
  amenity: {
    restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Pub', fast_food: 'Restauration rapide',
    ice_cream: 'Glacier', cinema: 'Cinéma', theatre: 'Théâtre', library: 'Bibliothèque', pharmacy: 'Pharmacie',
    marketplace: 'Marché', arts_centre: 'Centre d\'art', nightclub: 'Boîte de nuit',
  },
  tourism: {
    museum: 'Musée', gallery: 'Galerie', attraction: 'À voir', viewpoint: 'Point de vue', hotel: 'Hôtel',
    artwork: 'Œuvre d\'art', zoo: 'Zoo', aquarium: 'Aquarium',
  },
  leisure: { park: 'Parc', garden: 'Jardin', sports_centre: 'Centre sportif', swimming_pool: 'Piscine' },
  historic: { monument: 'Monument', memorial: 'Mémorial', castle: 'Château', church: 'Église' },
};
const FALLBACK = { shop: 'Magasin', amenity: 'Lieu', tourism: 'À voir', leisure: 'Loisirs', historic: 'Patrimoine', craft: 'Artisan', office: 'Bureau' };

/** Type de lieu en français, ou chaîne vide pour une rue, une ville, etc. */
export function kindLabel(category, type) {
  return KINDS[category]?.[type] ?? FALLBACK[category] ?? '';
}

/** Département d'un résultat (« 75 », « 92 »…), d'après le code ISO puis le code postal ; '' si inconnu. */
export function deptOf(a) {
  const iso = a?.['ISO3166-2-lvl6'];
  if (typeof iso === 'string' && /^FR-\w{2}/.test(iso)) return iso.slice(3, 5); // « FR-75C » (Ville de Paris) → « 75 »
  return typeof a?.postcode === 'string' && /^\d{5}$/.test(a.postcode) ? a.postcode.slice(0, 2) : '';
}

/** Garde les lieux nommés (pas les rues ni les simples adresses). `zone` : seulement Paris, 92, 93 et 94. */
export function parsePlaces(json, { zone = false } = {}) {
  const out = [];
  for (const r of Array.isArray(json) ? json : []) {
    if (zone && deptOf(r?.address) && !ZONE_DEPTS.includes(deptOf(r?.address))) continue; // département inconnu : gardé (déjà dans le rectangle)
    const lat = Number(r?.lat);
    const lng = Number(r?.lon);
    const name = typeof r?.name === 'string' ? r.name.trim() : '';
    const kind = kindLabel(r?.category, r?.type);
    if (!name || !kind || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const oh = r?.extratags?.opening_hours;
    out.push({ name, kind, address: shortAddress(r.address), lat, lng, hours: typeof oh === 'string' ? oh.slice(0, 300) : '' });
  }
  return zone ? out.slice(0, 8) : out;
}

/** Temps d'attente (ms) avant la prochaine requête pour rester à une par seconde. */
export function nextDelay(lastAt, now) {
  return Math.max(0, lastAt + GAP_MS - now);
}

let lastAt = 0;

/** Lieux correspondant au nom cherché. Lève une erreur si le service ne répond pas. */
export async function searchPlaces(q, signal, { zone = false } = {}) {
  const wait = nextDelay(lastAt, Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastAt = Date.now();
  const res = await fetch(placesUrl(q.trim(), { zone }), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parsePlaces(await res.json(), { zone });
}
