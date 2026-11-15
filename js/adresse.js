// Recherche d'adresses avec le service public de géocodage de l'IGN
// (reprise de l'API Adresse de la Base Adresse Nationale).

const BASE = 'https://data.geopf.fr/geocodage';
const PARIS = { lat: 48.8566, lon: 2.3522 };

export function searchUrl(q) {
  const u = new URL(`${BASE}/search`);
  u.search = new URLSearchParams({ q, limit: '5', autocomplete: '1', lat: String(PARIS.lat), lon: String(PARIS.lon) });
  return u.toString();
}

export function reverseUrl(lat, lng) {
  const u = new URL(`${BASE}/reverse`);
  u.search = new URLSearchParams({ lat: String(lat), lon: String(lng), limit: '1' });
  return u.toString();
}

/** Transforme la réponse GeoJSON en [{label, lat, lng, type}], en écartant ce qui est illisible.
 * type : 'housenumber' (adresse précise), 'street' (milieu de la rue), 'locality' ou 'municipality' (lieu-dit, ville). */
export function parseFeatures(json) {
  const list = Array.isArray(json?.features) ? json.features : [];
  const out = [];
  for (const f of list) {
    const c = f?.geometry?.coordinates;
    const label = f?.properties?.label;
    if (!Array.isArray(c) || typeof label !== 'string') continue;
    const [lng, lat] = c;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const type = typeof f.properties.type === 'string' ? f.properties.type : 'housenumber';
    out.push({ label, lat, lng, type });
  }
  return out;
}

async function getJSON(url, signal) {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Suggestions d'adresses (5 au plus). Lève une erreur en cas de souci réseau. */
export async function searchAddress(q, signal) {
  if (q.trim().length < 3) return [];
  return parseFeatures(await getJSON(searchUrl(q.trim()), signal));
}

/** Adresse la plus proche d'une position, ou null si introuvable ou sans réseau. */
export async function reverseAddress(lat, lng) {
  try {
    const r = parseFeatures(await getJSON(reverseUrl(lat, lng)));
    return r[0]?.label ?? null;
  } catch {
    return null;
  }
}
