// Recherche d'adresses avec le service public de géocodage de l'IGN
// (reprise de l'API Adresse de la Base Adresse Nationale).

const BASE = 'https://data.geopf.fr/geocodage';
const PARIS = { lat: 48.8566, lon: 2.3522 };

export function searchUrl(q, { zone = false } = {}) {
  const u = new URL(`${BASE}/search`);
  u.search = new URLSearchParams({ q, limit: zone ? '20' : '5', autocomplete: '1', lat: String(PARIS.lat), lon: String(PARIS.lon) });
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
    const citycode = f.properties.citycode;
    out.push({ label, lat, lng, type, ...(typeof citycode === 'string' ? { citycode } : {}) });
  }
  return out;
}

async function getJSON(url, signal) {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Paris et départements limitrophes : code commune qui commence par 75, 92, 93 ou 94. */
export const inZone = (r) => ['75', '92', '93', '94'].includes(String(r.citycode ?? '').slice(0, 2));

/** Suggestions d'adresses (5 au plus). `zone` : Paris, 92, 93 et 94 seulement. Lève une erreur en cas de souci réseau. */
export async function searchAddress(q, signal, { zone = false } = {}) {
  if (q.trim().length < 3) return [];
  const all = parseFeatures(await getJSON(searchUrl(q.trim(), { zone }), signal));
  return zone ? all.filter(inZone).slice(0, 5) : all;
}

/** Adresse la plus proche d'une position, ou null si introuvable ou sans réseau. */
/** Adresse officielle d'un point avec son code commune (75101…75120 pour les arrondissements). Lève une erreur réseau. */
export async function reverseInfo(lat, lng) {
  return parseFeatures(await getJSON(reverseUrl(lat, lng)))[0] ?? null;
}

export async function reverseAddress(lat, lng) {
  try {
    const r = parseFeatures(await getJSON(reverseUrl(lat, lng)));
    return r[0]?.label ?? null;
  } catch {
    return null;
  }
}
