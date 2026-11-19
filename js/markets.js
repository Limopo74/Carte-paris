// Marchés découverts de Paris (données ouvertes de la Ville de Paris) : jours et horaires de tenue.
import { distanceM } from './geo.js';

// Champs vérifiés sur l'API le 16 nov. 2026. Sans les contours (geo_shape), lourds et inutiles ici.
export const MARKETS_URL = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/marches-decouverts/exports/json'
  + '?select=nom_court,nom_long,produit,localisation,lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche,h_deb_sem_1,h_fin_sem_1,h_deb_sam,h_fin_sam,h_deb_dim,h_fin_dim,geo_point_2d';
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
const SMALL = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'aux', 'au', 'sur', 'en', 'à', 'd', 'l']);
/** « MARCHÉ CHARONNE » → « Marché Charonne » (les noms arrivent en majuscules) ; un nom déjà en casse mixte est gardé. */
export function niceName(s) {
  if (!s || s !== s.toUpperCase()) return s;
  return s.toLowerCase().split(/(\s+|-|')/).map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join('');
}

function point(r) {
  for (const g of [r.geo_point_2d, r.geo_point, r.coordonnees]) {
    if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) return { lat: g.lat, lng: g.lon };
    if (Array.isArray(g) && g.length === 2) return { lat: Number(g[0]), lng: Number(g[1]) };
  }
  const c = r.geo_shape?.geometry?.coordinates;
  if (r.geo_shape?.geometry?.type === 'Point' && Array.isArray(c)) return { lat: c[1], lng: c[0] };
  return null;
}

/* v253 : deux marchés dont le fichier de la Ville (avril 2024) donne des jours faux, corrigés d'après le tableau
   « Les horaires des marchés alimentaires » de paris.fr (lu le 19 nov. 2026 pour les 19 au 28 novembre).
   Télégraphe : le fichier dit jeudi et samedi ; c'est mercredi et samedi. Saint-Didier : le fichier ajoute le vendredi
   et dit 8 h au lieu de 7 h, 13 h 30 au lieu de 14 h 30 le samedi. Clé = `nom_court` du fichier, en majuscules.
   Jours [dim..sam] : null = pas de marché ce jour-là. Les autres écarts relevés (claude/idee-marches-decouverts.md) restent. */
export const MARKET_FIX_CHECKED = '19 novembre 2026';
export const MARKET_FIX_SOURCE = 'https://www.paris.fr/lieux/marches-alimentaires/tous-les-horaires';
export const MARKET_FIX = {
  TELEGRAPHE: [null, null, null, '07:00-13:30', null, null, '07:00-14:30'],
  'SAINT DIDIER': [null, null, '07:00-13:30', null, '07:00-13:30', null, '07:00-14:30'],
};
/** « Marché Saint-Didier », « SAINT DIDIER » → « SAINT DIDIER » (sans accents ni « Marché »). */
const fixKey = (n) => str(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/^MARCHE\s+/, '').replace(/[\s-]+/g, ' ').trim();
/** Un marché découvert avec ses jours corrigés s'il est dans MARKET_FIX (aussi une copie gardée d'avant la v253). */
export function fixMarket(m, key = m?.name) {
  const fix = !m || m.covered ? null : MARKET_FIX[fixKey(key)] ?? MARKET_FIX[fixKey(m.name)];
  return fix ? { ...m, fixed: true, days: fix.map(Boolean), slots: fix.map((x) => (x ? x.split(',').map((y) => y.split('-')) : [])) } : m;
}

/** [{ name, lat, lng, days: [dim..sam], hours: { week, sat, sun }, products, place, fixed? }] */
export function parseMarkets(json) {
  const out = [];
  for (const r of Array.isArray(json) ? json : []) {
    const p = point(r);
    if (!p || !(p.lat > 48.7 && p.lat < 49)) continue;
    const name = cap(niceName(str(r.nom_long) || str(r.nom_court) || str(r.nom) || 'Marché'));
    out.push(fixMarket({
      name: /^march/i.test(name) ? name : `Marché ${name}`, ...p,
      days: DAYS.map((d) => yes(r[d])),
      hours: {
        week: [hm(r.h_deb_sem_1), hm(r.h_fin_sem_1)],
        sat: [hm(r.h_deb_sam), hm(r.h_fin_sam)],
        sun: [hm(r.h_deb_dim), hm(r.h_fin_dim)],
      },
      products: str(r.produit),
      place: str(r.localisation).slice(0, 160),
    }, str(r.nom_court) || name));
  }
  return out;
}

/** Plages du jour [[début, fin], …] au format « 7h30 » (une seule pour un marché découvert, deux s'il ferme à midi). */
function rangesToday(m, date) {
  const d = date.getDay();
  if (m.slots) return (m.slots[d] ?? []).map(([a, b]) => [hm(a), hm(b)]);
  const [a, b] = d === 0 ? m.hours.sun : d === 6 ? m.hours.sat : m.hours.week;
  return a ? [[a, b]] : [];
}

/** Horaires du jour (« 7h–14h30 », « 8h–13h, 16h–19h30 ») ou '' s'ils ne sont pas connus. */
export function hoursToday(m, date = new Date()) {
  return rangesToday(m, date).map(([a, b]) => (b ? `${a}–${b}` : `dès ${a}`)).join(', ');
}

/** Où en est le marché maintenant : { when: 'now' | 'later' | 'done', text } (« Jusqu'à 13h », « À 8h », « Rouvre à 16h »). */
export function whenToday(m, now = new Date()) {
  const ranges = rangesToday(m, now);
  if (!ranges.length) return { when: 'now', text: '' }; // horaires inconnus : on le montre, sans heure
  const toMin = (t) => { const x = /^(\d{1,2})h(\d{2})?$/.exec(t); return x ? Number(x[1]) * 60 + Number(x[2] ?? 0) : null; };
  const min = now.getHours() * 60 + now.getMinutes();
  for (const [i, [a, b]] of ranges.entries()) {
    const s = toMin(a); const e = b ? toMin(b) : null;
    if (s == null) return { when: 'now', text: '' };
    if (min < s) return { when: 'later', text: `${i ? 'Rouvre à' : 'À'} ${a}` };
    if (e == null || min < e) return { when: 'now', text: e != null ? `Jusqu'à ${b}` : '' };
  }
  return { when: 'done', text: '' };
}

/* ---------- Marchés couverts ----------
   Pas de données ouvertes à jour pour eux : liste fixe, relevée sur paris.fr (« Les horaires des marchés alimentaires »)
   le 16 novembre 2026. Positions : IGN. À revoir chaque année avec les autres listes fixes (js/art.js).
   Saint-Didier (16e) est absent : la Ville n'en donne pas les horaires. Tous sont fermés le lundi. */
export const COVERED_CHECKED = '16 novembre 2026';
export const COVERED_CHECKED_ON = '2026-11-16'; // même date, lisible par l'appli (rappel au bout d'un an)
const week = (sun, tueFri, sat = tueFri) => [sun, null, tueFri, tueFri, tueFri, tueFri, sat];
export const COVERED_MARKETS = [
  ['Marché couvert des Enfants-Rouges', '39 rue de Bretagne, Paris 3e', 48.862954, 2.362155, week('08:30-17:00', '08:30-20:30')],
  ['Marché couvert Saint-Germain', '4-6 rue Lobineau, Paris 6e', 48.851813, 2.336471, week('08:00-13:30', '08:00-20:00')],
  ['Marché couvert Saint-Quentin', '85 bis boulevard de Magenta, Paris 10e', 48.876975, 2.355191, week('08:00-13:30', '08:00-20:00')],
  ['Marché couvert Saint-Martin', '31-33 rue du Château-d\'Eau, Paris 10e', 48.870946, 2.35855, week('09:00-14:00', '09:00-20:00')],
  ['Marché couvert Beauvau (Aligre)', 'Place d\'Aligre, Paris 12e', 48.848935, 2.378178, week('08:00-13:30', '08:00-13:00,16:00-19:30', '08:00-19:30')],
  ['Marché couvert de Passy', 'Place de Passy, Paris 16e', 48.857747, 2.277738, week('08:00-13:00', '08:00-13:00,16:00-19:00', '08:00-19:00')],
  ['Marché couvert des Batignolles', '96 bis rue Lemercier, Paris 17e', 48.889372, 2.319134, week('08:30-14:00', '09:00-14:00,16:00-20:30', '08:30-20:30')],
  ['Marché couvert des Ternes', '8 bis rue Lebon, Paris 17e', 48.881131, 2.291995, week('08:00-13:00', '08:00-14:30,16:00-19:30', '08:00-19:30')],
  ['Marché couvert La Chapelle', '10 rue de l\'Olive, Paris 18e', 48.89094, 2.361347, week('08:30-13:30', '09:00-20:00', '09:00-19:30')],
].map(([name, place, lat, lng, days]) => ({
  name, place, lat, lng, covered: true, products: '',
  days: days.map(Boolean),
  slots: days.map((s) => (s ? s.split(',').map((r) => r.split('-')) : [])),
  hours: { week: ['', ''], sat: ['', ''], sun: ['', ''] },
}));

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
