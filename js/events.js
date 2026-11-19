// Sorties du jour : agenda « Que faire à Paris ? » de la Ville de Paris (données ouvertes).
// On télécharge les événements du jour sans envoyer sa position, puis on garde les plus proches sur le téléphone.
import { distanceM } from './geo.js';

const BASE = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/exports/json';
const iso = (d) => d.toISOString();
/** « 2026-11-17 » : le jour tel qu'il est écrit dans les créneaux de l'agenda (heure de Paris). */
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Une ou plusieurs journées : la sortie a un créneau ces jours-là, ou n'en publie aucun (tri ensuite sur le téléphone). */
const onDays = (days) => `(${days.map((d) => `occurrences like "*${dayKey(d)}T*"`).join(' OR ')} OR occurrences is null)`;

/** Champs utiles seulement : la semaine entière de tout Paris reste légère (sans les longues descriptions ni les créneaux). */
export const EVENT_FIELDS = 'title,lat_lon,date_start,date_end,date_description,address_name,address_street,address_zipcode,address_city,price_type,qfap_tags,url,event_indoor,cover_url,cover_credit,cover_alt,access_type,access_link,access_link_text,contact_url,contact_organisation_name';

/** Une adresse de site donnée par l'organisateur : https seulement (jamais http, javascript: ni data:), sinon ''. */
export function safeLink(u) {
  try { const x = new URL(String(u ?? '').trim()); return x.protocol === 'https:' && x.hostname.includes('.') ? x.href : ''; } catch { return ''; }
}
/** Le nom du site écrit en clair à côté d'un lien : « philharmoniedeparis.fr » (sans www). */
export const siteName = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
/** Réservation selon l'organisateur (v164) : 'required' (obligatoire), 'advised' (conseillée), 'none' (sans), ou '' si rien n'est dit. */
const BOOKING = { obligatoire: 'required', conseillee: 'advised', non: 'none' };
export const bookingOf = (v) => BOOKING[String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()] ?? '';

/**
 * Événements d'aujourd'hui : ceux qui ont un créneau aujourd'hui, ou aucun créneau publié (todayOnly décide ensuite).
 * Le 17 nov. 2026, 1 500 sorties couvraient la journée par leurs dates, mais 418 seulement avaient un créneau ce jour-là :
 * le filtre sur les créneaux évite de perdre des sorties au-delà de la limite.
 */
export function eventsUrl(now = new Date()) {
  const end = new Date(now); end.setHours(23, 59, 0, 0);
  const u = new URL(BASE);
  u.search = new URLSearchParams({ where: `date_end >= "${iso(now)}" AND date_start <= "${iso(end)}" AND ${onDays([now])}`,
    select: `${EVENT_FIELDS},occurrences,lead_text`, limit: '1000' }).toString();
  return u.toString();
} // sans « occurrences » : trop lourd pour la semaine
/** Événements en cours ou qui commencent dans les `days` jours, pour tout Paris (aucune position envoyée). */
export function weekEventsUrl(now = new Date(), days = 7, light = true) {
  const end = new Date(now); end.setDate(end.getDate() + days); end.setHours(23, 59, 0, 0);
  const u = new URL(BASE);
  const list = Array.from({ length: days + 1 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() + i); return d; });
  const q = { where: `date_end >= "${iso(now)}" AND date_start <= "${iso(end)}" AND ${onDays(list)}`, limit: light ? '3000' : '800' };
  if (light) q.select = EVENT_FIELDS;
  u.search = new URLSearchParams(q).toString();
  return u.toString();
}

/**
 * Heure de l'agenda : c'est l'heure de Paris écrite avec un faux fuseau (« 20:00:00+00:00 » veut dire 20 h à Paris ;
 * les créneaux portent « +02:00 » même en hiver). On lit donc l'heure telle qu'elle est écrite, sans le fuseau.
 * Vérifié le 16 nov. 2026 sur l'API (concert à 20 h : date_start 20:00+00:00, créneau 20:00+02:00).
 */
export function wallTime(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(typeof s === 'string' ? s : '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0));
  return Number.isNaN(d.getTime()) ? null : d;
}
/** Créneaux « début_fin;début_fin… » : seulement ceux d'hier à dans 8 jours (une sortie peut en avoir des centaines). */
export function parseSlots(text, now = new Date()) {
  if (typeof text !== 'string' || !text.includes('_')) return null;
  const from = new Date(now); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - 1);
  const to = new Date(from); to.setDate(to.getDate() + 10);
  const out = [];
  for (const part of text.split(';')) {
    const [a, b] = part.split('_');
    const s = wallTime(a); const e = wallTime(b);
    if (s && e && e >= from && s <= to) out.push({ start: s, end: e });
  }
  return out; // tableau vide : la sortie a des créneaux, mais aucun ces jours-ci
}
/**
 * Les sorties d'aujourd'hui, avec leur vrai créneau : en cours ou plus tard dans la journée.
 * Une sortie sans créneau publié (« occurrences » vide) n'a pas de jour connu : elle n'est gardée que si
 * `keepUndated(e)` le permet (une expo, ouverte toute sa période), et jamais dite « aujourd'hui » (whenText).
 */
export function todayOnly(events, now = new Date(), keepUndated = () => false) {
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const out = [];
  for (const e of events) {
    if (!e.slots) { if (keepUndated(e) && (!e.end || e.end >= now)) out.push(e); continue; }
    const slot = e.slots.filter((x) => x.end > now && x.start <= end).sort((a, b) => a.start - b.start)[0];
    if (slot) out.push({ ...e, slotStart: slot.start, slotEnd: slot.end });
  }
  return out;
}

/**
 * Les dates officielles de l'agenda (« Le samedi 21 novembre 2026 de 15h00 à 16h30 »), en lignes de texte brut,
 * 6 au plus (puis « … »). Une ligne qui commence par « de » (l'heure) rejoint la précédente.
 */
export function officialDates(html) {
  if (typeof html !== 'string') return [];
  const lines = [];
  for (const raw of html.split(/<br\s*\/?>/i)) {
    const t = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!t) continue;
    if (/^de \d/.test(t) && lines.length) lines[lines.length - 1] += ` ${t}`; else lines.push(t);
  }
  return lines.length > 6 ? [...lines.slice(0, 6), '…'] : lines;
}
const str = (v) => (typeof v === 'string' ? v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '');
function where(r) {
  for (const g of [r.lat_lon, r.geo_point_2d, r.geo]) {
    if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) return { lat: g.lat, lng: g.lon };
    if (Array.isArray(g) && g.length === 2) return { lat: Number(g[0]), lng: Number(g[1]) };
  }
  return null;
}

/**
 * Point par défaut de l'agenda quand l'organisateur n'a pas placé sa sortie (près de l'Hôtel de Ville), quelle que soit
 * l'adresse : la Cité des sciences s'y trouvait « à 30 m » du centre de Paris. 77 sorties sur 830 le 17 nov. 2026.
 */
const DEFAULT_POINT = { lat: 48.856578, lng: 2.351828 };
export const unknownPlace = (p) => Math.abs(p.lat - DEFAULT_POINT.lat) < 5e-5 && Math.abs(p.lng - DEFAULT_POINT.lng) < 5e-5;

/** [{ title, lat, lng, start, end, place, address, url, free, lead }] — ce qui est illisible ou mal placé est écarté. */
export function parseEvents(json, now = new Date()) {
  const out = [];
  for (const r of Array.isArray(json) ? json : []) {
    const p = where(r);
    const title = str(r.title);
    if (!p || !title || !(p.lat > 48 && p.lat < 49.5) || unknownPlace(p)) continue; // sans position connue : pas de distance inventée
    const start = wallTime(r.date_start);
    const end = wallTime(r.date_end);
    const price = str(r.price_type).toLowerCase();
    const tags = (Array.isArray(r.qfap_tags) ? r.qfap_tags.join(';') : str(r.qfap_tags)).slice(0, 200);
    out.push({
      title: title.slice(0, 120), ...p,
      start, end, slots: parseSlots(r.occurrences, now),
      place: str(r.address_name).slice(0, 80),
      address: [str(r.address_street), str(r.address_zipcode), str(r.address_city)].filter(Boolean).join(' ').slice(0, 120),
      url: /^https:\/\//.test(r.url ?? '') ? r.url : '',
      free: price.startsWith('gratuit'),
      freeSure: price === 'gratuit', // sans « sous condition » (v187 : seul ce cas va dans « Maintenant »)
      lead: str(r.lead_text).slice(0, 200),
      dates: officialDates(r.date_description),
      tags,
      indoor: r.event_indoor === 1 ? true : r.event_indoor === 0 ? false : null, // rempli par l'organisateur
      // Photo officielle de l'agenda (serveur d'images de la Ville seulement), avec son crédit
      cover: /^https:\/\/cdn\.paris\.fr\/[\w./-]+\.(?:jpe?g|png|webp)$/i.test(r.cover_url ?? '') ? r.cover_url : '',
      coverCredit: str(r.cover_credit).slice(0, 100),
      coverAlt: str(r.cover_alt).slice(0, 150),
      // Réserver et s'informer (v164), tel que l'organisateur l'a écrit dans l'agenda
      booking: bookingOf(r.access_type),
      book: safeLink(r.access_link),
      bookText: str(r.access_link_text).slice(0, 40),
      site: safeLink(r.contact_url),
      org: str(r.contact_organisation_name).slice(0, 80),
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

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/**
 * v191 : le prochain créneau d'une sortie de la semaine (Mes salles, Grands lieux, Mes artistes, recherche) :
 * « Jusqu'à 15h », « Aujourd'hui à 19h », « Demain à 20h30 », « Samedi 21 nov. à 20h ». Créneaux de l'agenda seulement ;
 * sans créneau connu : '' (la ligne garde sa date de fin). Un créneau qui commence à 0h n'a pas d'heure (journée entière).
 */
export function nextSlotText(e, now = new Date()) {
  const s = (e?.slots ?? []).filter((x) => x.end > now).sort((a, b) => a.start - b.start)[0];
  if (!s) return '';
  const hm = (d) => `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`.replace('h00', 'h');
  if (s.start <= now) return s.end.toDateString() === now.toDateString() ? `Jusqu'à ${hm(s.end)}` : 'En cours';
  const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const n = Math.round((day0(s.start) - day0(now)) / 864e5);
  const at = s.start.getHours() || s.start.getMinutes() ? ` à ${hm(s.start)}` : '';
  if (n === 0) return `Aujourd'hui${at}`;
  if (n === 1) return `Demain${at}`;
  const jour = s.start.toLocaleDateString('fr-FR', { weekday: 'long' });
  return `${jour[0].toUpperCase()}${jour.slice(1)} ${s.start.getDate()} ${MOIS[s.start.getMonth()]}${at}`;
}

/**
 * « à 20h30 », « jusqu'à 22h », « en cours aujourd'hui » : seulement quand le créneau du jour est connu.
 * Sans créneau connu (aucun publié, ou données de la semaine), jamais « aujourd'hui » : « jusqu'au 22 nov. »,
 * ou rien. Mieux vaut ne rien dire que dire faux (17 nov. 2026).
 */
export function whenText(e, now = new Date()) {
  const hm = (d) => `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`.replace('h00', 'h');
  if (e.slotStart) {
    if (e.slotStart > now) return `à ${hm(e.slotStart)}`;
    if (e.slotEnd && e.slotEnd.toDateString() === now.toDateString()) return `jusqu'à ${hm(e.slotEnd)}`;
    return 'en cours aujourd\'hui'; // créneau commencé qui finit après minuit
  }
  if (e.start && e.start > now && e.start.toDateString() === now.toDateString()) return `à ${hm(e.start)}`;
  if (e.end && e.end >= now) return `jusqu'au ${e.end.getDate()} ${MOIS[e.end.getMonth()]}`;
  return '';
}

/**
 * Rubrique d'un événement : 'brocante' (brocantes, vide-greniers, puces), 'fete' (fêtes, bals, carnavals) ou 'autre'.
 * v220 : « festival » n'en fait plus une fête. L'agenda met l'étiquette « Festival » à des centaines de concerts,
 * projections et rencontres en salle (221 le 19 nov., tous « en salle » sur les 10 jours suivants) ; « fêtent » non plus.
 */
const BROC = /brocante|vide[- ]?grenier|march[ée] aux puces|\bpuces\b|braderie|\btroc\b|vide[- ]?dressing/i;
const FETE = /\bf[êe]tes?\b|\bbals?\b|carnaval|guinguette|kermesse|parade|f[ée]erie/i;
const FESTIVAL = /festival/i;
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
const INDOOR = /\b(mus[ée]e|galerie|sc[èe]ne|th[ée][âa]tre|cin[ée]ma|biblioth[èe]que|m[ée]diath[èe]que|salle|institut|fondation|conservatoire|auditorium|op[ée]ra|[ée]glise|mairie annexe|centre d'animation|centre culturel|gymnase|piscine)\b/i;
const EPHEMERAL = /march[ée] de no[eë]l|march[ée]s? de cr[ée]ateurs|march[ée] (artisanal|gourmand|des producteurs|bio|d'art)|village de no[eë]l|salon .*plein air|march[ée] [ée]ph[ée]m[èe]re/i;

/**
 * « Maintenant » (v158, v187) : la sortie la plus proche à `maxM` mètres, en cours ou dans la demi-heure, avec un créneau
 * connu aujourd'hui : { ...sortie, d, street } ou null. Soit dans la rue (devinée, comme avant), soit gratuite en salle :
 * « gratuit » sans condition, réservation « non » ou « conseillée » (jamais obligatoire ni inconnue),
 * et pas sur le point de finir (encore 15 min au moins). Dans le doute, rien.
 */
export function nowNearEvent(items, here, now = new Date(), maxM = 400) {
  if (!here) return null;
  const soon = now.getTime() + 30 * 60000;
  const freeIn = (e) => e.freeSure && (e.booking === 'none' || e.booking === 'advised') && e.slotEnd && e.slotEnd.getTime() >= now.getTime() + 15 * 60000;
  const list = todayOnly(items ?? [], now).filter((e) => e.slotStart && e.slotStart.getTime() <= soon)
    .map((e) => ({ ...e, street: !!streetKind(e) })).filter((e) => e.street || freeIn(e));
  return nearbyEvents(list, here, maxM)[0] ?? null;
}

/**
 * Type d'un événement de rue : 'marche' (éphémère), 'brocante', 'fete', 'expo' ; null s'il semble en salle.
 * Deviné d'après le titre, les mots-clés et le lieu : il y a des oublis et quelques erreurs.
 */
export function streetKind(e) {
  const text = `${e.title ?? ''} ${e.tags ?? ''}`;
  const where = `${e.place ?? ''} ${e.address ?? ''}`;
  const all = `${text} ${where} ${e.lead ?? ''}`;
  const indoor = INDOOR.test(e.place ?? '');
  const seenOut = OUTDOOR.test(`${text} ${e.place ?? ''}`) || /plein air|en ext[ée]rieur/i.test(e.lead ?? '');
  /* v220 : une fête ou un marché éphémère ne va dans la rue que sur un indice de plein air (rue, place, square…,
     ou « dehors » dans l'agenda) : sans indice, rien (Fête du piano à la Philharmonie, marché de Noël d'un café).
     « En salle » dans l'agenda n'exclut pas : il est faux pour des brocantes de boulevard (vu le 19 nov.). */
  const outdoor = seenOut || e.indoor === false;
  if (EPHEMERAL.test(all) && !indoor && outdoor) return 'marche';
  const k = eventKind(e);
  if (k === 'brocante') return indoor ? null : 'brocante';
  if (k === 'fete') return seenOut || (outdoor && !indoor) ? 'fete' : null;
  if (FESTIVAL.test(e.title ?? '') && seenOut && !indoor) return 'fete'; /* festival de rue : « festival » dans le titre (pas l'étiquette) et un lieu de plein air écrit */
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
/* v220 : les étiquettes de l'agenda (« Concert;Festival », « Balade urbaine;Histoire »…) disent l'activité mieux que le titre.
   Seules celles-ci comptent ; les autres (Festival, Loisirs, Histoire, Sport, Nature…) ne disent pas de genre. */
const TAG_GENRE = { 'concert': 'musique', 'spectacle musical': 'musique', 'theatre': 'scene', 'danse': 'scene', 'cirque': 'scene',
  'humour': 'scene', 'ecrans': 'cine', 'balade urbaine': 'balade', 'atelier': 'atelier', 'conference': 'atelier' };
const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
/** Genre donné par les étiquettes de l'agenda : un seul genre possible, sinon null (on se rabat sur le titre). */
export function tagGenre(tags) {
  const found = new Set(String(tags ?? '').split(/[;,]|->/).map((x) => TAG_GENRE[plain(x)]).filter(Boolean));
  return found.size === 1 ? [...found][0] : null;
}
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
  const byTag = tagGenre(e.tags);
  if (byTag) return byTag;
  const hits = GENRES.filter(([, re]) => re.test(t)).map(([g]) => g);
  return hits.length === 1 ? hits[0] : null;
}

/** Commence plus tard dans la journée (sinon : en ce moment). */
export const startsLater = (e, now = new Date()) => { const s = e.slotStart ?? e.start; return Boolean(s && s > now); };

/**
 * Filtre Dehors / À l'abri : where = « out » (dehors), « in » (à l'abri) ou '' (tout).
 * inside : true à l'abri, false dehors, null inconnu (écarté dès qu'un filtre est choisi).
 * Événement : e.indoor (champ « event_indoor » de l'agenda) ; marché : m.covered (couvert ou découvert).
 */
export const passWhere = (inside, where) => !where || (inside != null && (where === 'in') === inside);
