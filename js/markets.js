// Marchés découverts de Paris (données ouvertes de la Ville de Paris) : jours et horaires de tenue.
import { distanceM } from './geo.js';

export const MARKETS_URL = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/marches-decouverts/exports/json';
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const yes = (v) => v === 1 || v === '1' || v === true || /^(oui|o|1)$/i.test(str(v));
/** « 7h30 », « 07:30 », « 7 h 30 » → « 7h30 » ; vide si illisible. */
export function hm(v) {
  const m = /(\d{1,2})\s*[h:.]\s*(\d{0,2})/i.exec(str(v));
  if (!m) return '';
  const h = Number(m[1]); const mi = m[2] ? Number(m[2]) : 0;
  if (h > 23 || mi > 59) return '';
  return `${h}h${mi ? String(mi).padStart(2, '0') : ''}`;
}
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

function point(r) {
  for (const g of [r.geo_point_2d, r.geo_point, r.coordonnees]) {
    if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) return { lat: g.lat, lng: g.lon };
    if (Array.isArray(g) && g.length === 2) return { lat: Number(g[0]), lng: Number(g[1]) };
  }
  const c = r.geo_shape?.geometry?.coordinates;
  if (r.geo_shape?.geometry?.type === 'Point' && Array.isArray(c)) return { lat: c[1], lng: c[0] };
  return null;
}

/** [{ name, lat, lng, days: [dim..sam], hours: { week, sat, sun }, products, place }] */
export function parseMarkets(json) {
  const out = [];
  for (const r of Array.isArray(json) ? json : []) {
    const p = point(r);
    if (!p || !(p.lat > 48.7 && p.lat < 49)) continue;
    const name = cap(str(r.nom_long) || str(r.nom_court) || str(r.nom) || 'Marché');
    out.push({
      name: /^march/i.test(name) ? name : `Marché ${name}`, ...p,
      days: DAYS.map((d) => yes(r[d])),
      hours: {
        week: [hm(r.h_deb_sem_1), hm(r.h_fin_sem_1)],
        sat: [hm(r.h_deb_sam), hm(r.h_fin_sam)],
        sun: [hm(r.h_deb_dim), hm(r.h_fin_dim)],
      },
      products: str(r.produit),
      place: str(r.localisation).slice(0, 160),
    });
  }
  return out;
}

/** Horaires du jour (« 7h–14h30 ») ou '' s'ils ne sont pas connus. */
export function hoursToday(m, date = new Date()) {
  const d = date.getDay();
  const [a, b] = d === 0 ? m.hours.sun : d === 6 ? m.hours.sat : m.hours.week;
  return a && b ? `${a}–${b}` : a ? `dès ${a}` : '';
}

/** Les marchés qui se tiennent ce jour-là. */
export const marketsOn = (list, date = new Date()) => list.filter((m) => m.days[date.getDay()]);

/** Les marchés du jour les plus proches. */
export function nearestMarkets(list, here, date = new Date(), k = 3) {
  return marketsOn(list, date).map((m) => ({ ...m, d: distanceM(here, m) })).sort((a, b) => a.d - b.d).slice(0, k);
}

/* ---------- Qualité de l'air (Open-Meteo, indice européen) ---------- */

export function airUrl(lat = 48.857, lng = 2.352) {
  const u = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  u.search = new URLSearchParams({ latitude: lat.toFixed(2), longitude: lng.toFixed(2), current: 'european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide', timezone: 'Europe/Paris' });
  return u.toString();
}

const LEVELS = [[20, 'bon', 'Bon'], [40, 'correct', 'Correct'], [60, 'moyen', 'Moyen'], [80, 'mediocre', 'Médiocre'], [100, 'tres-mediocre', 'Très médiocre'], [Infinity, 'extreme', 'Extrêmement médiocre']];
/** { aqi, level, label, pm25, pm10, o3, no2 } ou null. */
export function readAir(json) {
  const c = json?.current;
  const aqi = Number(c?.european_aqi);
  if (!c || !Number.isFinite(aqi)) return null;
  const [, level, label] = LEVELS.find(([max]) => aqi <= max);
  const n = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);
  return { aqi: Math.round(aqi), level, label, pm25: n(c.pm2_5), pm10: n(c.pm10), o3: n(c.ozone), no2: n(c.nitrogen_dioxide) };
}
