// Expos et art : dernière chance, galeries (OpenStreetMap), gratuités, temps forts, le quartier (Wikipédia).
// Tout est trié sur le téléphone ; aucune position n'est envoyée, sauf à Wikipédia, arrondie à 100 m (comme Curiosités).
import { distanceM } from './geo.js';
import { openState } from './hours.js';

const DAY = 864e5;
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.round((dayStart(b) - dayStart(a)) / DAY);
const shortDate = (d) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });

/* ---------- 1. Dernière chance : les expos qui ferment bientôt ---------- */

const EXPO = /\bexpo|exposition|vernissage|galerie|biennale|photograph|art contemporain|r[ée]trospective|accrochage/i;
const NOT_EXPO = /brocante|vide[- ]?grenier|\bpuces\b|braderie|concert|spectacle|atelier enfant/i;
/** Une sortie de l'agenda qui ressemble à une exposition (titre, mots-clés ou lieu). */
export const isExpo = (e) => EXPO.test(`${e.title ?? ''} ${e.tags ?? ''}`) && !NOT_EXPO.test(e.title ?? '');

/** Les expos en cours qui ferment dans les `days` jours, de la plus pressée à la moins pressée. */
export function lastChance(events, now = new Date(), days = 7) {
  return events.filter((e) => isExpo(e) && e.end && e.end >= now && daysBetween(now, e.end) < days)
    .sort((a, b) => a.end - b.end);
}

/** Arrondissement d'une sortie d'après son code postal (75003 → 3, 75116 → 16), ou null hors Paris. */
export function arrondOf(e) {
  const m = /\b75(0(\d\d)|116)\b/.exec(`${e.address ?? ''} ${e.zip ?? ''}`);
  if (!m) return null;
  const n = m[1] === '116' ? 16 : Number(m[2]);
  return n >= 1 && n <= 20 ? n : null;
}

/**
 * Les expos de la semaine dans tout Paris, rangées par arrondissement (1er → 20e, puis « hors Paris »).
 * Dans chaque arrondissement : celles qui ferment le plus tôt d'abord. Doublons (même titre, même lieu) retirés.
 */
export function weekExpos(events, now = new Date(), days = 7) {
  const until = dayStart(now).getTime() + (days + 1) * DAY;
  const seen = new Set();
  const list = events.filter((e) => isExpo(e) && (!e.end || e.end >= now) && (!e.start || e.start.getTime() < until))
    .filter((e) => { const k = `${e.title}|${Math.round(e.lat * 1e3)}|${Math.round(e.lng * 1e3)}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const groups = new Map();
  for (const e of list) { const a = arrondOf(e); if (!groups.has(a)) groups.set(a, []); groups.get(a).push(e); }
  const far = 864e13;
  for (const g of groups.values()) g.sort((a, b) => (a.end?.getTime() ?? far) - (b.end?.getTime() ?? far) || a.title.localeCompare(b.title, 'fr'));
  return [...groups.entries()].sort(([a], [b]) => (a ?? 99) - (b ?? 99)).map(([arr, items]) => ({ arr, items }));
}

/** « Dès samedi 21 nov. » pour une expo pas encore ouverte, sinon la date de fin. */
export function weekText(e, now = new Date()) {
  if (e.start && dayStart(e.start) > dayStart(now)) return `Dès ${shortDate(e.start)}`;
  return e.end ? endText(e.end, now) : 'En cours';
}

/** « Dernier jour », « Finit demain », « Finit dimanche 22 nov. ». */
export function endText(end, now = new Date()) {
  const n = daysBetween(now, end);
  if (n <= 0) return 'Dernier jour';
  if (n === 1) return 'Finit demain';
  return `Finit ${shortDate(end)}`;
}

/* ---------- 3. Galeries : liste de Paris téléchargée une fois (OpenStreetMap) ---------- */

const BBOX = '48.815,2.224,48.902,2.470'; // tout Paris : la même demande pour tout le monde
export const GALLERIES_QUERY = `[out:json][timeout:30];(nwr["tourism"="gallery"](${BBOX});nwr["shop"="art"](${BBOX});nwr["amenity"="arts_centre"](${BBOX}););out center tags;`;
export const galleriesUrl = () => `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(GALLERIES_QUERY)}`;

/** [{ id, name, lat, lng, hours, kind, site, address }] ; ce qui n'a ni nom ni position est écarté. */
export function parseGalleries(json) {
  const out = [];
  const seen = new Set();
  for (const e of Array.isArray(json?.elements) ? json.elements : []) {
    const t = e.tags ?? {};
    const lat = Number.isFinite(e.lat) ? e.lat : e.center?.lat;
    const lng = Number.isFinite(e.lon) ? e.lon : e.center?.lon;
    const name = typeof t.name === 'string' ? t.name.trim().slice(0, 100) : '';
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${name.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const site = [t.website, t['contact:website']].find((u) => typeof u === 'string' && /^https:\/\//.test(u)) ?? '';
    out.push({
      id: `${e.type ?? 'n'}/${e.id ?? key}`, name, lat, lng,
      hours: typeof t.opening_hours === 'string' ? t.opening_hours.slice(0, 300) : '',
      kind: t.amenity === 'arts_centre' ? 'Centre d\'art' : 'Galerie',
      site,
      address: [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ').slice(0, 120),
    });
  }
  return out;
}

/** Les galeries à moins de `maxM` : ouvertes d'abord, puis horaires inconnus, puis fermées ; chaque groupe par distance. */
export function galleriesNear(list, here, date = new Date(), maxM = 1500) {
  const rank = (g) => { const st = openState(g.hours, date); return st?.open ? 0 : st ? 2 : 1; };
  return list.map((g) => ({ ...g, d: distanceM(here, g), r: rank(g) })).filter((g) => g.d <= maxM)
    .sort((a, b) => a.r - b.r || a.d - b.d);
}

/* ---------- 5. Gratuit aujourd'hui (liste fixe, vérifiée à la date ci-dessous) ---------- */

export const FREE_CHECKED = '16 novembre 2026';
export const FREE_CHECKED_ON = '2026-11-16'; // même date, lisible par l'appli (rappel au bout d'un an)
export const FREE_SOURCE = 'https://parisjetaime.com/visiter-a-paris/infos/guides/les-musees-et-monuments-gratuits-a-paris';
// always : collections permanentes des musées de la Ville de Paris ; first-sunday : 1er dimanche du mois ;
// first-friday-evening : 1er vendredi du mois après 18 h, sauf juillet et août (Louvre).
export const FREE_PLACES = [
  { name: 'Musée d\'Art moderne de Paris', lat: 48.8645, lng: 2.2977, rule: 'always' },
  { name: 'Petit Palais', lat: 48.8661, lng: 2.3144, rule: 'always' },
  { name: 'Musée Carnavalet', lat: 48.8575, lng: 2.3625, rule: 'always' },
  { name: 'Musée Cognacq-Jay', lat: 48.8592, lng: 2.3618, rule: 'always' },
  { name: 'Musée Cernuschi', lat: 48.8792, lng: 2.3115, rule: 'always' },
  { name: 'Musée Bourdelle', lat: 48.8432, lng: 2.3188, rule: 'always' },
  { name: 'Musée Zadkine', lat: 48.8432, lng: 2.3341, rule: 'always' },
  { name: 'Musée de la Vie romantique', lat: 48.8813, lng: 2.3335, rule: 'always' },
  { name: 'Maison de Victor Hugo', lat: 48.8547, lng: 2.3664, rule: 'always' },
  { name: 'Maison de Balzac', lat: 48.8553, lng: 2.2803, rule: 'always' },
  { name: 'Musée d\'Orsay', lat: 48.8600, lng: 2.3266, rule: 'first-sunday', note: 'réservation obligatoire' },
  { name: 'Musée de l\'Orangerie', lat: 48.8638, lng: 2.3227, rule: 'first-sunday' },
  { name: 'Musée Picasso', lat: 48.8598, lng: 2.3624, rule: 'first-sunday' },
  { name: 'Musée du quai Branly', lat: 48.8609, lng: 2.2977, rule: 'first-sunday' },
  { name: 'Musée de Cluny', lat: 48.8505, lng: 2.3439, rule: 'first-sunday' },
  { name: 'Musée des Arts et Métiers', lat: 48.8666, lng: 2.3555, rule: 'first-sunday' },
  { name: 'Musée du Louvre', lat: 48.8606, lng: 2.3376, rule: 'first-friday-evening' },
];

const firstOfMonth = (date, dow) => date.getDay() === dow && date.getDate() <= 7;

/** Ce qui est gratuit ce jour-là : [{ ...lieu, when }] ; when dit quoi (« collections », « dès 18 h »…). */
export function freeToday(date = new Date()) {
  const out = [];
  for (const p of FREE_PLACES) {
    if (p.rule === 'always') out.push({ ...p, when: 'collections permanentes, tous les jours' });
    else if (p.rule === 'first-sunday' && firstOfMonth(date, 0)) out.push({ ...p, when: `1er dimanche du mois${p.note ? ` · ${p.note}` : ''}` });
    else if (p.rule === 'first-friday-evening' && firstOfMonth(date, 5) && ![6, 7].includes(date.getMonth())) out.push({ ...p, when: '1er vendredi du mois, dès 18 h' });
  }
  return out;
}

/** Les gratuités du jour les plus proches : celles du jour même (pas « tous les jours ») passent devant. */
export function freeNear(here, date = new Date(), maxM = 3000, k = 3) {
  return freeToday(date).map((p) => ({ ...p, d: distanceM(here, p) })).filter((p) => p.d <= maxM)
    .sort((a, b) => (a.rule === 'always') - (b.rule === 'always') || a.d - b.d).slice(0, k);
}

/* ---------- 8. Temps forts de l'année (dates vérifiées, à compléter chaque année) ---------- */

export const HIGHLIGHTS_CHECKED = '16 novembre 2026';
export const HIGHLIGHTS = [
  { name: 'Nuit Blanche', from: '2027-06-05', to: '2027-06-05', what: 'art contemporain dans toute la ville, la nuit, gratuit' },
  { name: 'Fête de la musique', from: '2027-06-21', to: '2027-06-21', what: 'concerts gratuits partout' },
  { name: 'Art Basel Paris', from: '2027-10-22', to: '2027-10-24', what: 'foire d\'art moderne et contemporain, Grand Palais' },
];
const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/** Les temps forts en cours ou qui commencent dans les `days` jours. */
export function highlightsSoon(date = new Date(), days = 7, list = HIGHLIGHTS) {
  const today = dayStart(date);
  return list.filter((h) => parseDay(h.to) >= today && daysBetween(today, parseDay(h.from)) <= days);
}

/** Listes fixes à mettre à jour ? Plus aucun temps fort à venir, ou gratuités vérifiées il y a plus d'un an. */
export function listsStale(date = new Date(), list = HIGHLIGHTS, checkedOn = FREE_CHECKED_ON) {
  const today = dayStart(date);
  return !list.some((h) => parseDay(h.to) >= today) || daysBetween(parseDay(checkedOn), today) > 365;
}

/** « En ce moment : Art Basel Paris (jusqu'au dimanche 24 oct.) » ou « Samedi 5 juin : Nuit Blanche ». */
export function highlightText(h, date = new Date()) {
  const from = parseDay(h.from); const to = parseDay(h.to);
  if (from <= dayStart(date)) return `En ce moment : ${h.name}${+to > +from ? ` (jusqu'au ${shortDate(to)})` : ''}`;
  const n = daysBetween(date, from);
  const when = n === 1 ? 'Demain' : shortDate(from).replace(/^./, (c) => c.toUpperCase());
  return `${when} : ${h.name}`;
}

/* ---------- 13. Le quartier en 3 lignes (Wikipédia) ---------- */

/** Articles autour (position arrondie à 100 m), avec leur courte description. */
export function quarterSearchUrl(lat, lng) {
  const u = new URL('https://fr.wikipedia.org/w/api.php');
  u.search = new URLSearchParams({
    action: 'query', generator: 'geosearch', ggscoord: `${lat.toFixed(3)}|${lng.toFixed(3)}`, ggsradius: '2000', ggslimit: '500',
    prop: 'description|coordinates', colimit: 'max', format: 'json', formatversion: '2', origin: '*',
  });
  return u.toString();
}

const QUARTER = /\bquartier\b/i;
const NOT_QUARTER = /\b(rue|gare|station|église|place|immeuble|hôtel|square|pont|lycée|école|théâtre|musée|marché)\b/i;
/** Le quartier le plus proche selon Wikipédia : { title, d } ou null. */
export function pickQuarter(json, here) {
  const pages = json?.query?.pages;
  const list = (Array.isArray(pages) ? pages : Object.values(pages ?? {}))
    .filter((p) => p?.title && QUARTER.test(p.description ?? '') && !NOT_QUARTER.test(p.description ?? '') && p.coordinates?.[0])
    .map((p) => ({ title: String(p.title), d: distanceM(here, { lat: p.coordinates[0].lat, lng: p.coordinates[0].lon }) }))
    .sort((a, b) => a.d - b.d);
  return list[0] ?? null;
}

/** Les 3 premières phrases d'un article (aucune position envoyée : seulement le titre). */
export function extractUrl(title) {
  const u = new URL('https://fr.wikipedia.org/w/api.php');
  u.search = new URLSearchParams({ action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '3', titles: title, format: 'json', formatversion: '2', origin: '*' });
  return u.toString();
}

export function readExtract(json) {
  const p = json?.query?.pages?.[0];
  const t = typeof p?.extract === 'string' ? p.extract.replace(/\s+/g, ' ').trim() : '';
  return t.slice(0, 600);
}

/* ---------- 6. Mon billet : l'heure de départ ---------- */

/** Heure de départ conseillée (Date) : l'heure du billet moins le trajet et 5 min de marge. */
export const leaveAt = (at, travelMin, margin = 5) => new Date(at - (travelMin + margin) * 60000);

/** Un billet à afficher dans « Maintenant » : aujourd'hui, pas plus de 30 min après l'heure. */
export function ticketToday(points, now = new Date()) {
  return points.filter((p) => Number.isFinite(p.ticket?.at) && dayStart(new Date(p.ticket.at)).getTime() === dayStart(now).getTime() && p.ticket.at > now - 30 * 60000)
    .sort((a, b) => a.ticket.at - b.ticket.at)[0] ?? null;
}
