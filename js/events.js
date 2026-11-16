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

/** Champs utiles seulement : la semaine entière de tout Paris reste légère (sans les longues descriptions). */
export const EVENT_FIELDS = 'title,lat_lon,date_start,date_end,address_name,address_street,address_zipcode,address_city,price_type,qfap_tags,url';
/** Événements en cours ou qui commencent dans les `days` jours, pour tout Paris (aucune position envoyée). */
export function weekEventsUrl(now = new Date(), days = 7, light = true) {
  const end = new Date(now); end.setDate(end.getDate() + days); end.setHours(23, 59, 0, 0);
  const u = new URL(BASE);
  const q = { where: `date_end >= "${iso(now)}" AND date_start <= "${iso(end)}"`, limit: light ? '3000' : '800' };
  if (light) q.select = EVENT_FIELDS;
  u.search = new URLSearchParams(q).toString();
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
    const tags = (Array.isArray(r.qfap_tags) ? r.qfap_tags.join(';') : str(r.qfap_tags)).slice(0, 200);
    out.push({
      title: title.slice(0, 120), ...p,
      start: start && !Number.isNaN(start.getTime()) ? start : null,
      end: end && !Number.isNaN(end.getTime()) ? end : null,
      place: str(r.address_name).slice(0, 80),
      address: [str(r.address_street), str(r.address_zipcode), str(r.address_city)].filter(Boolean).join(' ').slice(0, 120),
      url: /^https:\/\//.test(r.url ?? '') ? r.url : '',
      free: price.startsWith('gratuit'),
      lead: str(r.lead_text).slice(0, 200),
      tags,
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

/** Rubrique d'un événement : 'brocante' (brocantes, vide-greniers, puces), 'fete' (fêtes, festivals, bals) ou 'autre'. */
const BROC = /brocante|vide[- ]?grenier|march[ée] aux puces|\bpuces\b|braderie|\btroc\b|vide[- ]?dressing/i;
const FETE = /f[êe]te|festival|\bbal\b|carnaval|guinguette|kermesse|parade|f[ée]erie|f[êe]tes? de (quartier|rue)/i;
export function eventKind(e) {
  const t = `${e.title ?? ''} ${e.tags ?? ''}`;
  if (BROC.test(t)) return 'brocante';
  if (FETE.test(t)) return 'fete';
  if (BROC.test(e.lead ?? '')) return 'brocante';
  return 'autre';
}

/** Marché aux puces ou brocante dans la liste des marchés de la Ville. */
export const isFleaMarket = (m) => /puces|brocante|antiquit|livres? anciens?|vieux papiers/i.test(`${m.name ?? ''} ${m.products ?? ''}`);

/* ---------- Dans la rue : ce qui se passe sur la voie publique (deviné, donc approximatif) ---------- */

const OUTDOOR = /plein air|en ext[ée]rieur|dans la rue|\b(rue|place|square|parvis|quai|quais|jardin|jardins|parc|grilles?|esplanade|boulevard|bd|avenue|av\.|all[ée]e|promenade|berges?|canal|pont|cour|march[ée] couvert)\b/i;
const INDOOR = /\b(mus[ée]e|galerie|th[ée][âa]tre|cin[ée]ma|biblioth[èe]que|m[ée]diath[èe]que|salle|institut|fondation|conservatoire|auditorium|op[ée]ra|[ée]glise|mairie annexe|centre d'animation|centre culturel|gymnase|piscine)\b/i;
const EPHEMERAL = /march[ée] de no[eë]l|march[ée]s? de cr[ée]ateurs|march[ée] (artisanal|gourmand|des producteurs|bio|d'art)|village de no[eë]l|salon .*plein air|march[ée] [ée]ph[ée]m[èe]re/i;

/**
 * Type d'un événement de rue : 'marche' (éphémère), 'brocante', 'fete', 'expo' ; null s'il semble en salle.
 * Deviné d'après le titre, les mots-clés et le lieu : il y a des oublis et quelques erreurs.
 */
export function streetKind(e) {
  const text = `${e.title ?? ''} ${e.tags ?? ''}`;
  const where = `${e.place ?? ''} ${e.address ?? ''}`;
  const all = `${text} ${where} ${e.lead ?? ''}`;
  const indoor = INDOOR.test(e.place ?? '');
  const outdoor = OUTDOOR.test(`${text} ${e.place ?? ''}`) || /plein air|en ext[ée]rieur/i.test(e.lead ?? '');
  if (EPHEMERAL.test(all) && !indoor) return 'marche';
  const k = eventKind(e);
  if (k === 'brocante') return indoor ? null : 'brocante';
  if (k === 'fete') return indoor && !outdoor ? null : 'fete';
  if (/\bexpo|exposition|installation|sculpture|photograph/i.test(text) && outdoor && !indoor) return 'expo';
  return null;
}

/* ---------- Genre d'une sortie, pour son icône (deviné, donc prudent) ---------- */

const GENRES = [
  ['cine', /cin[ée]ma|cin[ée][- ]club|projection|\bfilms?\b|courts?[- ]m[ée]trages?|documentaire/i],
  ['musique', /concert|musique|musical|\bjazz|\brock\b|chorale|r[ée]cital|\bdj\b|chanson|\bop[ée]ra\b|electro|hip[- ]hop|orchestre|fanfare/i],
  ['scene', /th[ée][âa]tre|spectacle|\bdanse|cirque|humour|one[- ](wo)?man|lecture|\bcontes?\b|marionnettes?|stand[- ]up|\bimpro/i],
  ['balade', /balade|visite|promenade|randonn[ée]e|flânerie/i],
  ['atelier', /atelier|conf[ée]rence|rencontre|d[ée]bat|\bcours de\b|initiation|masterclass/i],
];
const FAMILLE = /\benfants?\b|jeune public|en famille|\bfamilles?\b|d[èe]s \d+ ans|b[ée]b[ée]s?\b|tout[- ]petits/i;

/**
 * Genre d'un événement : 'chiner', 'fete', 'expo', 'famille', 'cine', 'musique', 'scene', 'balade', 'atelier',
 * ou null quand ce n'est pas sûr (aucun indice, ou plusieurs genres possibles) : mieux vaut une icône neutre qu'une fausse.
 * `expo` : résultat de isExpo(e), calculé à part.
 */
export function genreOf(e, { expo = false } = {}) {
  const kind = eventKind(e);
  if (kind === 'brocante') return 'chiner';
  if (kind === 'fete') return 'fete';
  if (expo) return 'expo';
  const t = `${e.title ?? ''} ${e.tags ?? ''}`;
  if (FAMILLE.test(t)) return 'famille';
  const hits = GENRES.filter(([, re]) => re.test(t)).map(([g]) => g);
  return hits.length === 1 ? hits[0] : null;
}

/** Commence plus tard dans la journée (sinon : en ce moment). */
export const startsLater = (e, now = new Date()) => Boolean(e.start && e.start > now);
