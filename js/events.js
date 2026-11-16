// Sorties du jour : agenda « Que faire à Paris ? » de la Ville de Paris (données ouvertes).
// On télécharge les événements du jour sans envoyer sa position, puis on garde les plus proches sur le téléphone.
import { distanceM } from './geo.js';

const BASE = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/exports/json';
const iso = (d) => d.toISOString();

/** Événements en cours ou qui commencent avant la fin de la journée. */
export function eventsUrl(now = new Date()) {
  const end = new Date(now); end.setHours(23, 59, 0, 0);
  const u = new URL(BASE);
  u.search = new URLSearchParams({ where: `date_end >= "${iso(now)}" AND date_start <= "${iso(end)}"`, limit: '400' }).toString();
  return u.toString();
}

const str = (v) => (typeof v === 'string' ? v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '');
function where(r) {
  for (const g of [r.lat_lon, r.geo_point_2d, r.geo]) {
    if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) return { lat: g.lat, lng: g.lon };
    if (Array.isArray(g) && g.length === 2) return { lat: Number(g[0]), lng: Number(g[1]) };
  }
  return null;
}

/** [{ title, lat, lng, start, end, place, address, url, free, lead }] — ce qui est illisible est écarté. */
export function parseEvents(json) {
  const out = [];
  for (const r of Array.isArray(json) ? json : []) {
    const p = where(r);
    const title = str(r.title);
    if (!p || !title || !(p.lat > 48 && p.lat < 49.5)) continue;
    const start = r.date_start ? new Date(r.date_start) : null;
    const end = r.date_end ? new Date(r.date_end) : null;
    const price = str(r.price_type).toLowerCase();
    out.push({
      title: title.slice(0, 120), ...p,
      start: start && !Number.isNaN(start.getTime()) ? start : null,
      end: end && !Number.isNaN(end.getTime()) ? end : null,
      place: str(r.address_name).slice(0, 80),
      address: [str(r.address_street), str(r.address_zipcode), str(r.address_city)].filter(Boolean).join(' ').slice(0, 120),
      url: /^https:\/\//.test(r.url ?? '') ? r.url : '',
      free: price.startsWith('gratuit'),
      lead: str(r.lead_text).slice(0, 200),
    });
  }
  return out;
}

/** Les événements à moins de `maxM` mètres, du plus proche au plus loin, sans doublon de titre au même endroit. */
export function nearbyEvents(events, here, maxM = 2000) {
  const seen = new Set();
  return events.map((e) => ({ ...e, d: distanceM(here, e) })).filter((e) => e.d <= maxM)
    .sort((a, b) => a.d - b.d)
    .filter((e) => { const k = `${e.title}|${Math.round(e.lat * 1e3)}|${Math.round(e.lng * 1e3)}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** « jusqu'à 22h », « à 20h30 », « toute la journée ». */
export function whenText(e, now = new Date()) {
  const hm = (d) => `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`.replace('h00', 'h');
  if (e.start && e.start > now) return `à ${hm(e.start)}`;
  if (e.end && e.end.toDateString() === now.toDateString()) return `jusqu'à ${hm(e.end)}`;
  return 'en cours aujourd\'hui';
}
