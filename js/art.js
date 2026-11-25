// Expos et art : dernière chance, galeries (OpenStreetMap), gratuités, temps forts, le quartier (Wikipédia).
// Tout est trié sur le téléphone ; aucune position n'est envoyée, sauf à Wikipédia, arrondie à 100 m (comme Curiosités).
import { distanceM } from './geo.js';
import { openState } from './hours.js';
import { planEnd, isDayList } from './planning.js';

const DAY = 864e5;
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.round((dayStart(b) - dayStart(a)) / DAY);
const shortDate = (d) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });

/* ---------- 1. Dernière chance : les expos qui ferment bientôt ---------- */

const EXPO = /\bexpo|exposition|vernissage|galerie|biennale|photograph|art contemporain|r[ée]trospective|accrochage/i;
const NOT_EXPO = /brocante|vide[- ]?grenier|\bpuces\b|braderie|concert|spectacle|atelier enfant/i;
// v367 : un atelier, une visite, une projection… d'un lieu d'expo n'est pas une expo (vrais titres de l'agenda du 21 nov. :
// « Balade photographique », « Philo en famille », « Visite dansée en famille », tous marqués Expo ou Photo).
// Sauf si le titre commence par « Expo… », « Vernissage » ou « Derniers jours ».
const ACTIVITY = /\b(?:balades?|visites?|atelier|stages?|table ronde|conf[ée]rences?|rencontres?|philo|lectures?|projections?|d[ée]bats?|cours|masterclass|cin[ée]ma|films?|en famille)\b/i;
const EXPO_FIRST = /^\W*(?:expo|vernissage|derniers jours)/i;
// Mots-clés d'une activité ou d'une scène, sans le mot-clé « Expo » : ce n'est pas une expo (« Conférence;Histoire;Photo »).
const NOT_EXPO_TAG = /(?:^|;)\s*(?:atelier|conf[ée]rence|concert|danse|th[ée][âa]tre|cirque|spectacle|ecrans)\s*(?:;|$)/i;
/** Une sortie de l'agenda qui ressemble à une exposition (titre, mots-clés ou lieu). */
export const isExpo = (e) => {
  const title = e.title ?? '';
  const tags = e.tags ?? '';
  if (!EXPO.test(`${title} ${tags}`) || NOT_EXPO.test(title)) return false;
  if (EXPO_FIRST.test(title)) return true;
  return !ACTIVITY.test(title) && !(NOT_EXPO_TAG.test(tags) && !/(?:^|;)\s*expo\s*(?:;|$)/i.test(tags));
};

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

/* ---------- 3. Galeries : liste de tout Paris (OpenStreetMap) ---------- */
// v170 : le téléphone ne demande plus rien à OpenStreetMap. Le robot des données (tools/maj-art.mjs) envoie ces
// demandes une fois par mois et range la réponse dans data/galeries.json et data/oeuvres.json, lus par l'appli.

const BBOX = '48.815,2.224,48.902,2.470'; // tout Paris : la même demande pour tout le monde
export const GALLERIES_QUERY = `[out:json][timeout:180];(nwr["tourism"="gallery"](${BBOX});nwr["shop"="art"](${BBOX});nwr["amenity"="arts_centre"](${BBOX}););out center tags;`;
/** Les étiquettes OpenStreetMap lues par `parseGalleries` (le robot ne garde qu'elles). */
export const GALLERY_TAGS = ['name', 'opening_hours', 'amenity', 'website', 'contact:website', 'addr:housenumber', 'addr:street'];

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

export const FREE_CHECKED = '17 novembre 2026';
export const FREE_CHECKED_ON = '2026-11-17'; // même date, lisible par l'appli (rappel au bout d'un an)
export const FREE_SOURCE = 'https://parisjetaime.com/visiter-a-paris/infos/guides/les-musees-et-monuments-gratuits-a-paris';
// always : collections permanentes des musées de la Ville de Paris ; first-sunday : 1er dimanche du mois ;
// first-friday-evening : 1er vendredi du mois après 18 h, sauf juillet et août (Louvre) ;
// first-sunday-winter : 1er dimanche du mois de novembre à mars (monuments nationaux) ;
// first-saturday-evening : 1er samedi du mois de 17 h à 21 h, sur réservation (Bourse de Commerce).
// Horaires (format OpenStreetMap), vérifiés le 17 nov. 2026 : ceux du jour de gratuité seulement.
// Musées de la Ville : mardi-dimanche 10 h-18 h, fermés le lundi, le 1er janvier, le 1er mai et le 25 décembre
// (nocturnes réservées aux expositions payantes : non comptées). Sans horaire sûr (Hôtel de la Marine) : pas d'horaire, donc pas d'état affiché.
// url (v269) : le site officiel du lieu, relevé le 20 nov. 2026 ; un lien « Site officiel » sur sa page, qui dit de vérifier sur ce site.
const PM = { hours: 'Tu-Su 10:00-18:00', closed: ['01-01', '05-01', '12-25'] };
export const FREE_PLACES = [
  { name: 'Musée d\'Art moderne de Paris', url: 'https://www.mam.paris.fr/fr', lat: 48.8645, lng: 2.2977, rule: 'always', ...PM },
  { name: 'Petit Palais', url: 'https://www.petitpalais.paris.fr/', lat: 48.8661, lng: 2.3144, rule: 'always', ...PM },
  { name: 'Musée Carnavalet', url: 'https://www.carnavalet.paris.fr/', lat: 48.8575, lng: 2.3625, rule: 'always', ...PM },
  { name: 'Musée Cognacq-Jay', url: 'https://www.museecognacqjay.paris.fr/', lat: 48.8592, lng: 2.3618, rule: 'always', ...PM },
  { name: 'Musée Cernuschi', url: 'https://www.cernuschi.paris.fr/', lat: 48.8792, lng: 2.3115, rule: 'always', ...PM },
  { name: 'Musée Bourdelle', url: 'https://www.bourdelle.paris.fr/', lat: 48.8432, lng: 2.3188, rule: 'always', ...PM },
  { name: 'Musée Zadkine', url: 'https://www.zadkine.paris.fr/', lat: 48.8432, lng: 2.3341, rule: 'always', ...PM },
  { name: 'Musée de la Vie romantique', url: 'https://museevieromantique.paris.fr/fr', lat: 48.8813, lng: 2.3335, rule: 'always', ...PM },
  { name: 'Maison de Victor Hugo', url: 'https://www.maisonsvictorhugo.paris.fr/', lat: 48.8547, lng: 2.3664, rule: 'always', ...PM },
  { name: 'Maison de Balzac', url: 'https://www.maisondebalzac.paris.fr/', lat: 48.8553, lng: 2.2803, rule: 'always', ...PM },
  { name: 'Musée d\'Orsay', url: 'https://www.musee-orsay.fr/', lat: 48.8600, lng: 2.3266, rule: 'first-sunday', note: 'réservation obligatoire', hours: 'Su 09:30-18:00' },
  { name: 'Musée de l\'Orangerie', url: 'https://www.musee-orangerie.fr/', lat: 48.8638, lng: 2.3227, rule: 'first-sunday', hours: 'Su 09:00-18:00' },
  { name: 'Musée Picasso', url: 'https://www.museepicassoparis.fr/', lat: 48.8598, lng: 2.3624, rule: 'first-sunday', hours: 'Su 09:30-18:00' },
  { name: 'Musée du quai Branly', url: 'https://www.quaibranly.fr/', lat: 48.8609, lng: 2.2977, rule: 'first-sunday', hours: 'Su 10:30-19:00' },
  { name: 'Musée de Cluny', url: 'https://www.musee-moyenage.fr/', lat: 48.8505, lng: 2.3439, rule: 'first-sunday', hours: 'Su 09:30-18:15' },
  { name: 'Musée des Arts et Métiers', url: 'https://www.arts-et-metiers.net/', lat: 48.8666, lng: 2.3555, rule: 'first-sunday', hours: 'Su 10:00-18:00' },
  { name: 'Musée du Louvre', url: 'https://www.louvre.fr/', lat: 48.8606, lng: 2.3376, rule: 'first-friday-evening', hours: 'Fr 18:00-21:00' },
  { name: 'Arc de Triomphe', url: 'https://www.paris-arc-de-triomphe.fr/', lat: 48.8738, lng: 2.2950, rule: 'first-sunday-winter', hours: 'Su 10:00-22:30' },
  { name: 'Panthéon', url: 'https://www.paris-pantheon.fr/', lat: 48.8462, lng: 2.3464, rule: 'first-sunday-winter', hours: 'Su 10:00-18:00' },
  { name: 'Sainte-Chapelle', url: 'https://www.sainte-chapelle.fr/', lat: 48.8554, lng: 2.3450, rule: 'first-sunday-winter', hours: 'Su 09:00-17:00' },
  { name: 'Conciergerie', url: 'https://www.paris-conciergerie.fr/', lat: 48.8564, lng: 2.3457, rule: 'first-sunday-winter', hours: 'Su 09:30-18:00' },
  { name: 'Hôtel de la Marine', url: 'https://www.hotel-de-la-marine.paris/', lat: 48.8673, lng: 2.3229, rule: 'first-sunday-winter' },
  { name: 'Bourse de Commerce', url: 'https://www.pinaultcollection.com/fr/boursedecommerce', lat: 48.8628, lng: 2.3428, rule: 'first-saturday-evening', hours: 'Sa 17:00-21:00' },
];

const firstOfMonth = (date, dow) => date.getDay() === dow && date.getDate() <= 7;

/** Ce qui est gratuit ce jour-là : [{ ...lieu, when }] ; when dit quoi (« collections », « dès 18 h »…). */
export function freeToday(date = new Date()) {
  const out = [];
  for (const p of FREE_PLACES) {
    if (p.rule === 'always') out.push({ ...p, when: 'collections permanentes, du mardi au dimanche, 10 h – 18 h' });
    else if (p.rule === 'first-sunday' && firstOfMonth(date, 0)) out.push({ ...p, when: `1er dimanche du mois${p.note ? ` · ${p.note}` : ''}` });
    else if (p.rule === 'first-friday-evening' && firstOfMonth(date, 5) && ![6, 7].includes(date.getMonth())) out.push({ ...p, when: '1er vendredi du mois, dès 18 h' });
    else if (p.rule === 'first-sunday-winter' && firstOfMonth(date, 0) && winter(date)) out.push({ ...p, when: '1er dimanche du mois, de novembre à mars' });
    else if (p.rule === 'first-saturday-evening' && firstOfMonth(date, 6)) out.push({ ...p, when: '1er samedi du mois, 17 h à 21 h, sur réservation' });
  }
  return out;
}

const winter = (date) => [10, 11, 0, 1, 2].includes(date.getMonth());

/** Les prochains jours de gratuité (hors aujourd'hui), dans les `days` jours : [{ date, text }], du plus proche au plus loin. */
export function freeSoon(date = new Date(), days = 35) {
  const out = [];
  const today = dayStart(date);
  for (let i = 1; i <= days; i += 1) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const text = freeDayText(d);
    if (!text) continue;
    out.push({ date: d, text, line: `${shortDate(d).replace(/^./, (c) => c.toUpperCase())} : ${text}` });
  }
  return out;
}

/** Ce qui est gratuit ce jour-là en plus des musées de la Ville (« musées nationaux », « Louvre dès 18 h »…), ou ''. */
function freeDayText(d) {
  if (!freeToday(d).some((p) => p.rule !== 'always')) return '';
  return firstOfMonth(d, 0) ? `musées nationaux${winter(d) ? ' et monuments (Arc de Triomphe, Panthéon, Sainte-Chapelle…)' : ''}`
    : firstOfMonth(d, 5) ? 'Louvre dès 18 h' : 'Bourse de Commerce de 17 h à 21 h, sur réservation';
}

/**
 * Bandeau « Maintenant » (v158) : le prochain jour gratuit, aujourd'hui, demain ou après-demain : { k, when, text } ou null.
 * Aujourd'hui : seulement si au moins un de ces lieux n'a pas déjà fermé (rien d'annoncé pour une soirée finie).
 */
export function freeBanner(date = new Date()) {
  for (let k = 0; k <= 2; k += 1) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + k);
    const text = freeDayText(d);
    if (!text) continue;
    if (k === 0 && !freeToday(date).some((p) => p.rule !== 'always' && spotRank(p, date) !== 2)) continue;
    const when = k === 0 ? 'aujourd\'hui' : k === 1 ? 'demain' : d.toLocaleDateString('fr-FR', { weekday: 'long' });
    return { k, when, text: text.replace(/^./, (c) => c.toUpperCase()) };
  }
  return null;
}

/* ---------- 5 bis. Théâtre à moitié prix : les Kiosques (places du jour même) ---------- */

export const KIOSQUE_SOURCE = 'https://www.kiosqueculture.com/infos-pratiques/';
/** Date de la dernière vérification du Kiosque sur son site officiel (v225 : relue par les tâches du 1er mars et du 1er septembre). */
export const KIOSQUE_CHECKED = '17 novembre 2026';
// Vérifié sur le site officiel le 17 nov. 2026 : seul le kiosque de la Madeleine est ouvert
// (Montparnasse : « fermeture provisoire » ; Ternes : n'existe plus).
export const KIOSQUES = [
  { name: 'Kiosque Théâtre Madeleine', address: 'En face du 15, place de la Madeleine, 8e', lat: 48.8704, lng: 2.3245, hours: 'Mardi au samedi 12 h 30 – 14 h 30 et 15 h – 19 h 30, dimanche 12 h 30 – 15 h 45 (fériés compris, sauf 25 déc. et 1er janv.)',
    oh: 'Tu-Sa 12:30-14:30,15:00-19:30; Su 12:30-15:45', closed: ['12-25', '01-01'] },
];

/** Horaires d'un lieu de la liste à cette date (format OpenStreetMap) : '' s'ils ne sont pas connus, « fermé » un jour de fermeture annuelle. */
export function spotHours(p, date = new Date()) {
  const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if ((p?.closed ?? []).includes(md)) return 'Mo-Su off';
  return p?.oh ?? p?.hours ?? '';
}
/** 0 : ouvert ou ouvre plus tard aujourd'hui ; 1 : horaires inconnus ; 2 : fermé pour la journée. */
export function spotRank(p, date = new Date()) {
  const st = openState(spotHours(p, date), date);
  return !st ? 1 : st.open || st.opensAt ? 0 : 2;
}
/** Les gratuités du jour les plus proches : ouvertes d'abord (fermées à la fin), puis celles du jour même (pas « du mardi au dimanche »). */
export function freeNear(here, date = new Date(), maxM = 3000, k = 3) {
  return freeToday(date).map((p) => ({ ...p, d: distanceM(here, p), r: spotRank(p, date) })).filter((p) => p.d <= maxM)
    .sort((a, b) => a.r - b.r || (a.rule === 'always') - (b.rule === 'always') || a.d - b.d).slice(0, k);
}

/**
 * « Gratuit aujourd'hui » dans « Maintenant » (v187) : le lieu gratuit du jour (pas les musées de la Ville, gratuits toute
 * l'année) le plus proche à `maxM` mètres, pas encore fermé : ouvert ou qui ouvre plus tard d'abord, horaires inconnus ensuite.
 */
export function freeDayNear(here, date = new Date(), maxM = 1200) {
  if (!here) return null;
  return freeToday(date).filter((p) => p.rule !== 'always').map((p) => ({ ...p, d: distanceM(here, p), r: spotRank(p, date) }))
    .filter((p) => p.d <= maxM && p.r !== 2).sort((a, b) => a.r - b.r || a.d - b.d)[0] ?? null;
}

/* ---------- 5 ter. Grands lieux : liste fixe, leurs événements tirés de l'agenda de la Ville (toute distance) ---------- */

export const ART_PLACES_CHECKED = '17 novembre 2026';
export const ART_MUSIC_CHECKED = '20 novembre 2026'; // v290 : les 11 salles de concert ajoutées ce jour-là
export const ART_SCENE_CHECKED = '20 novembre 2026'; // v300 : les 6 scènes de théâtre et de danse ajoutées ce jour-là
// kind : art (art contemporain et photo), expo (musées aux grandes expositions temporaires), musique, scene (théâtre et danse).
// Musée Maillol écarté : fermé pour travaux jusqu'au 13 janvier 2027. Centre Pompidou : fermé jusqu'en 2030 (ses expos sont au Grand Palais).
// match : morceau du nom du lieu tel que l'agenda « Que faire à Paris ? » l'écrit (sans accents ni majuscules).
// late (v158) : nocturnes habituelles, vérifiées le 17 nov. 2026 sur le site de chaque lieu (ou paris.fr) ; d = jours (0 dimanche),
// to = fermeture, first = seulement le 1er de ces jours du mois. Lieu sans nocturne sûre : pas de `late` (Fondation Louis Vuitton :
// 21 h ou 23 h selon les sources ; Picasso : aucune ; Cartier, Galliera, Arts décoratifs, Jacquemart-André : non vérifiées).
// last (v195) : minutes avant la fermeture où l'on n'entre plus sans billet (fermeture du guichet, sinon dernière entrée), lues
// le 18 nov. 2026 sur le site de chaque lieu : Bourse de Commerce et Palais de Tokyo (règlement de visite : billetterie 45 min avant),
// MEP (règlement : caisses 30 min avant), Grand Palais et Luxembourg (guichet 1 h avant, dernière entrée 45 min avant), Louvre
// (dernière admission 1 h avant), quai Branly (guichets à 21 h le jeudi), Marmottan (dernière entrée 20 h le jeudi), Cité de
// l'architecture (billetterie à 20 h 20 le jeudi). Pas de `last` sans heure lue sur le site officiel (Orsay : site refusé ;
// Art moderne : site en maintenance) : le lieu quitte alors « Ce soir » LATE_MARGIN minutes avant, et aucune heure ne s'affiche.
export const ART_PLACES = [
  { name: 'Bourse de Commerce', kind: 'art', address: '2 rue de Viarmes, 1er', lat: 48.8628, lng: 2.3428, site: 'https://www.pinaultcollection.com/fr/boursedecommerce', match: 'bourse de commerce', last: 45, late: [{ d: [5], to: '21:00' }, { d: [6], to: '21:00', first: true, note: 'gratuit, sur réservation' }] },
  { name: 'Fondation Cartier', kind: 'art', address: '2 place du Palais-Royal, 1er', lat: 48.8627, lng: 2.3368, site: 'https://www.fondationcartier.com', match: 'fondation cartier pour' },
  { name: 'Fondation Louis Vuitton', kind: 'art', address: '8 avenue du Mahatma-Gandhi, 16e', lat: 48.8766, lng: 2.2633, site: 'https://www.fondationlouisvuitton.fr/fr', match: 'louis vuitton' },
  { name: 'Palais de Tokyo', kind: 'art', address: '13 avenue du Président-Wilson, 16e', lat: 48.8641, lng: 2.2966, site: 'https://palaisdetokyo.com', match: 'palais de tokyo', last: 45, late: [{ d: [1, 3, 5, 6, 0], to: '22:00' }, { d: [4], to: '24:00' }], lateNote: 'ouvert seulement pendant les expositions' },
  { name: 'Musée d\'Art moderne de Paris', kind: 'art', address: '11 avenue du Président-Wilson, 16e', lat: 48.8645, lng: 2.2977, site: 'https://www.mam.paris.fr', match: 'musee d\'art moderne de paris', late: [{ d: [4], to: '21:30', note: 'expositions temporaires seulement' }] },
  { name: 'Jeu de Paume', kind: 'art', address: 'Jardin des Tuileries, 1 place de la Concorde, 8e', lat: 48.8656, lng: 2.3243, site: 'https://jeudepaume.org', match: 'jeu de paume' },
  { name: 'Lafayette Anticipations', kind: 'art', address: '9 rue du Plâtre, 4e', lat: 48.8597, lng: 2.3546, site: 'https://www.lafayetteanticipations.com', match: 'lafayette anticipations' },
  { name: 'Maison européenne de la photographie', kind: 'art', address: '5-7 rue de Fourcy, 4e', lat: 48.8551, lng: 2.3592, site: 'https://www.mep-fr.org', match: 'maison europeenne de la photographie', last: 30, late: [{ d: [4], to: '22:00' }] },
  { name: 'Fondation Henri Cartier-Bresson', kind: 'art', address: '79 rue des Archives, 3e', lat: 48.8627, lng: 2.3612, site: 'https://www.henricartierbresson.org', match: 'cartier-bresson' },
  { name: 'Fondation Pernod Ricard', kind: 'art', address: '1 cours Paul-Ricard, 8e', lat: 48.8768, lng: 2.3216, site: 'https://www.fondation-pernod-ricard.com', match: 'pernod ricard' },
  { name: 'Grand Palais', kind: 'expo', address: 'Avenue Winston-Churchill, 8e (entrée Clemenceau)', lat: 48.8660, lng: 2.3126, site: 'https://www.grandpalais.fr/fr', match: 'grand palais', last: 60, late: [{ d: [5], to: '22:00', note: 'expositions' }] },
  { name: 'Musée du Louvre', kind: 'expo', address: 'Rue de Rivoli, 1er', lat: 48.8606, lng: 2.3376, site: 'https://www.louvre.fr', match: 'musee du louvre', last: 60, late: [{ d: [3, 5], to: '21:00' }] },
  { name: 'Musée d\'Orsay', kind: 'expo', address: 'Esplanade Valéry-Giscard-d\'Estaing, 7e', lat: 48.8600, lng: 2.3266, site: 'https://www.musee-orsay.fr', match: 'musee d\'orsay', late: [{ d: [4], to: '21:45' }] },
  { name: 'Musée de l\'Orangerie', kind: 'expo', address: 'Jardin des Tuileries, 1er', lat: 48.8638, lng: 2.3227, site: 'https://www.musee-orangerie.fr', match: 'orangerie' },
  { name: 'Musée du Luxembourg', kind: 'expo', address: '19 rue de Vaugirard, 6e', lat: 48.8489, lng: 2.3341, site: 'https://museeduluxembourg.fr', match: 'musee du luxembourg', last: 60, late: [{ d: [1], to: '22:00' }], lateNote: 'ouvert seulement pendant les expositions' },
  { name: 'Petit Palais', kind: 'expo', address: 'Avenue Winston-Churchill, 8e', lat: 48.8661, lng: 2.3144, site: 'https://www.petitpalais.paris.fr', match: 'petit palais' },
  { name: 'Musée des Arts décoratifs', kind: 'expo', address: '107 rue de Rivoli, 1er', lat: 48.8631, lng: 2.3333, site: 'https://madparis.fr', match: 'arts decoratifs' },
  { name: 'Musée du quai Branly', kind: 'expo', address: '37 quai Branly, 7e', lat: 48.8609, lng: 2.2977, site: 'https://www.quaibranly.fr', match: 'quai branly', last: 60, late: [{ d: [4], to: '22:00' }] },
  { name: 'Institut du monde arabe', kind: 'expo', address: '1 rue des Fossés-Saint-Bernard, 5e', lat: 48.8490, lng: 2.3572, site: 'https://www.imarabe.org', match: 'monde arabe' },
  { name: 'Musée Jacquemart-André', kind: 'expo', address: '158 boulevard Haussmann, 8e', lat: 48.8755, lng: 2.3106, site: 'https://www.musee-jacquemart-andre.com/fr', match: 'jacquemart' },
  { name: 'Musée Marmottan Monet', kind: 'expo', address: '2 rue Louis-Boilly, 16e', lat: 48.8592, lng: 2.2672, site: 'https://www.marmottan.fr', match: 'marmottan', last: 60, late: [{ d: [4], to: '21:00' }] },
  { name: 'Musée Picasso', kind: 'expo', address: '5 rue de Thorigny, 3e', lat: 48.8598, lng: 2.3624, site: 'https://www.museepicassoparis.fr', match: 'picasso' },
  { name: 'Cité de l\'architecture', kind: 'expo', address: '1 place du Trocadéro, 16e', lat: 48.8625, lng: 2.2880, site: 'https://www.citedelarchitecture.fr/fr', match: 'cite de l\'architecture', last: 40, late: [{ d: [4], to: '21:00' }] },
  { name: 'Palais Galliera', kind: 'expo', address: '10 avenue Pierre-Ier-de-Serbie, 16e', lat: 48.8660, lng: 2.2967, site: 'https://www.palaisgalliera.paris.fr', match: 'galliera' },
  { name: 'Maison de la Radio et de la Musique', kind: 'musique', address: '116 avenue du Président-Kennedy, 16e', lat: 48.8524, lng: 2.2785, site: 'https://www.maisondelaradioetdelamusique.fr/agenda', match: 'maison de la radio' },
  { name: 'Philharmonie de Paris', kind: 'musique', address: '221 avenue Jean-Jaurès, 19e', lat: 48.8919, lng: 2.3940, site: 'https://philharmoniedeparis.fr', match: 'philharmonie de paris' },
  // v290 : 11 salles de concert de plus (mes choix 1B 2B du 20 nov.), vérifiées le ART_MUSIC_CHECKED. Adresse lue sur le site
  // officiel de chaque salle ; position de la base des adresses de l'IGN, sauf les deux Opéras (Wikidata, sans numéro de rue)
  // et la Seine Musicale (bâtiment d'OpenStreetMap, concordant avec Wikidata ; le point d'adresse de l'IGN est à 600 m).
  // match : nom écrit par l'agenda « Que faire à Paris ? » le 20 nov. ; « l'olympia » et pas « olympia » (les Olympiades),
  // « theatre des champs » (écrit « Champs-Elysées », « Champs Elysées » ou « champs-Elysées »).
  // Opéras et Olympia : presque rien dans l'agenda (1 rendez-vous chacun) ; ils sont là pour leur programme officiel.
  { name: 'Théâtre du Châtelet', kind: 'musique', address: '1 place du Châtelet, 1er', lat: 48.8576, lng: 2.3468, site: 'https://www.chatelet.com', match: 'theatre du chatelet' },
  { name: 'Théâtre des Champs-Élysées', kind: 'musique', address: '15 avenue Montaigne, 8e', lat: 48.8657, lng: 2.3033, site: 'https://www.theatrechampselysees.fr', match: 'theatre des champs' },
  { name: 'Salle Pleyel', kind: 'musique', address: '252 rue du Faubourg-Saint-Honoré, 8e', lat: 48.8770, lng: 2.3010, site: 'https://www.sallepleyel.com', match: 'salle pleyel' },
  { name: 'Salle Gaveau', kind: 'musique', address: '45-47 rue La Boétie, 8e', lat: 48.8735, lng: 2.3142, site: 'https://www.sallegaveau.com', match: 'salle gaveau' },
  { name: 'Salle Cortot', kind: 'musique', address: '78 rue Cardinet, 17e', lat: 48.8842, lng: 2.3093, site: 'https://www.sallecortot.com', match: 'salle cortot' },
  { name: 'La Cigale', kind: 'musique', address: '120 boulevard Marguerite-de-Rochechouart, 18e', lat: 48.8823, lng: 2.3402, site: 'https://www.lacigale.fr', match: 'la cigale' },
  { name: 'Le Trianon', kind: 'musique', address: '80 boulevard Marguerite-de-Rochechouart, 18e', lat: 48.8829, lng: 2.3430, site: 'https://www.letrianon.fr', match: 'le trianon' },
  { name: 'Opéra Garnier', kind: 'musique', address: 'Place de l\'Opéra, 9e', lat: 48.8719, lng: 2.3317, site: 'https://www.operadeparis.fr', match: 'opera garnier' },
  { name: 'Opéra Bastille', kind: 'musique', address: 'Place de la Bastille, 12e', lat: 48.8519, lng: 2.3706, site: 'https://www.operadeparis.fr', match: 'opera bastille' },
  { name: 'L\'Olympia', kind: 'musique', address: '28 boulevard des Capucines, 9e', lat: 48.8702, lng: 2.3284, site: 'https://www.olympiahall.com', match: 'l\'olympia' },
  { name: 'La Seine Musicale', kind: 'musique', address: 'Île Seguin, Boulogne-Billancourt', lat: 48.8260, lng: 2.2298, site: 'https://www.laseinemusicale.com', match: 'seine musicale' },
  // v300 : Théâtre et danse (mes choix 1A 2A du 20 nov.) : les grandes scènes publiques que l'agenda « Que faire à Paris ? »
  // annonçait le 20 nov. (Chaillot 31 rendez-vous, Théâtre de la Ville 9 et Abbesses 2, Centquatre 4, Colline 2, Rond-Point 1).
  // Pas prises, rien dans l'agenda ce jour-là : Comédie-Française, Odéon, Bouffes du Nord, Théâtre du Soleil.
  // Adresses : site officiel (Colline, Rond-Point, Centquatre), ministère de la Culture (Chaillot), agenda de la Ville
  // (Théâtre de la Ville, ses deux salles). Positions : base des adresses de l'IGN, sauf Chaillot (Wikidata Q1342159,
  // à 70 m du point de l'agenda ; « place du Trocadéro » sans numéro trouvé par l'IGN). Site de Chaillot lu sur
  // culture.gouv.fr (le site ne s'ouvrait pas depuis le navigateur dans le cloud le 20 nov.).
  // match : les Abbesses avant le Théâtre de la Ville (sinon ses spectacles iraient place du Châtelet) ; pas « abbesses »
  // seul (Métro Abbesses, Studios de Danse des Abbesses, Manufacture des Abbesses) ; pas « chaillot » seul (musée de la Marine).
  { name: 'Chaillot – Théâtre national de la Danse', kind: 'scene', address: '1 place du Trocadéro, 16e', lat: 48.8623, lng: 2.2882, site: 'https://theatre-chaillot.fr', match: 'theatre national de la danse' },
  { name: 'Théâtre de la Ville – Les Abbesses', kind: 'scene', address: '31 rue des Abbesses, 18e', lat: 48.8848, lng: 2.3374, site: 'https://www.theatredelaville-paris.com', match: ['theatre de la ville - abbesses', 'theatre de la ville - les abbesses'] },
  { name: 'Théâtre de la Ville – Sarah Bernhardt', kind: 'scene', address: '2 place du Châtelet, 4e', lat: 48.8573, lng: 2.3478, site: 'https://www.theatredelaville-paris.com', match: 'theatre de la ville' },
  { name: 'La Colline – théâtre national', kind: 'scene', address: '15 rue Malte-Brun, 20e', lat: 48.8645, lng: 2.3977, site: 'https://www.colline.fr', match: 'la colline - theatre' },
  { name: 'Théâtre du Rond-Point', kind: 'scene', address: '2 bis avenue Franklin-D.-Roosevelt, 8e', lat: 48.8678, lng: 2.3105, site: 'https://www.theatredurondpoint.fr', match: 'theatre du rond-point' },
  { name: 'Le Centquatre (104)', kind: 'scene', address: '5 rue Curial, 19e', lat: 48.8900, lng: 2.3715, site: 'https://www.104.fr', match: 'centquatre' },
];

const plain = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’`]/g, '\'').replace(/\s+/g, ' ');
/** Le grand lieu d'un événement de l'agenda (par le nom du lieu), ou null. */
// v300 : `match` peut être une liste de graphies (les Abbesses).
const matches = (p) => [].concat(p.match);
export const artPlaceOf = (e, places = ART_PLACES) => { const n = plain(e?.place); return n ? places.find((p) => matches(p).some((m) => n.includes(m))) ?? null : null; };

/**
 * v519 (mes choix 1A 2A 3A du 25 nov.) : le grand lieu d'un de mes lieux, pour « Au programme » sur sa fiche.
 * Par le nom (le même nom, ou une graphie de `match` dans le nom) ET à moins de 150 m : jamais par la seule distance,
 * jamais par le seul nom (le Théâtre de la Ville a deux adresses). Rien n'est envoyé.
 */
export function artPlaceForPoint(pt, places = ART_PLACES) {
  const n = plain(pt?.name).trim();
  if (!n || !Number.isFinite(pt?.lat) || !Number.isFinite(pt?.lng)) return null;
  const near = places.filter((p) => (plain(p.name).trim() === n || matches(p).some((m) => n.includes(m))) && distanceM(pt, p) <= 150);
  return near.sort((a, b) => distanceM(pt, a) - distanceM(pt, b))[0] ?? null;
}

/** Les grands lieux dont le nom contient tous les mots tapés (sans accents ; au moins 3 lettres en tout). */
export function findArtPlaces(q, places = ART_PLACES) {
  const words = plain(q).split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  if (plain(q).replace(/\s/g, '').length < 3 || !words.length) return [];
  return places.filter((p) => { const hay = plain(`${p.name} ${matches(p).join(' ')}`); return words.every((w) => hay.includes(w)); });
}

/** Chaque grand lieu avec ses événements de l'agenda, ceux qui finissent le plus tôt d'abord, sans doublon de titre. */
export function artPlacesWith(events, places = ART_PLACES) {
  const by = new Map(places.map((p) => [p, []]));
  for (const e of events ?? []) {
    const p = artPlaceOf(e, places);
    if (p && !by.get(p).some((x) => x.title === e.title)) by.get(p).push(e);
  }
  return places.map((p) => ({ ...p, events: by.get(p).sort((a, b) => (a.end ?? Infinity) - (b.end ?? Infinity)) }));
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

/** Heure de départ conseillée (Date) : l'heure du billet moins le trajet et la marge (5 min sans réglage ; v365 : Réglages → Autres réglages → Distances et durées, 20 min au départ). */
export const leaveAt = (at, travelMin, margin = 5) => new Date(at - (travelMin + margin) * 60000);

/** Une sortie à afficher dans « Maintenant » : aujourd'hui, pas plus de 30 min après l'heure (ou avant la fin du moment choisi). */
export function ticketToday(points, now = new Date()) {
  return points.filter((p) => Number.isFinite(p.ticket?.at) && !isDayList(p.ticket) && dayStart(new Date(p.ticket.at)).getTime() === dayStart(now).getTime() && planEnd(p.ticket) > now) /* la liste du jour n'a pas d'heure : « Maintenant » ne la rappelle pas */
    .sort((a, b) => a.ticket.at - b.ticket.at)[0] ?? null;
}

/* ---------- 14. Mes artistes (v158) : les noms que je suis, cherchés tels quels dans l'agenda de la Ville ---------- */

/** Liste de noms nettoyée : sans doublon (accents et majuscules ignorés), 2 lettres au moins, 60 signes au plus. Pas de limite de nombre. */
export function cleanArtists(list) {
  const seen = new Set();
  const out = [];
  for (const s of Array.isArray(list) ? list : []) {
    if (typeof s !== 'string') continue;
    const name = s.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const key = plain(name).replace(/[^a-z0-9]+/g, ' ').trim();
    if (key.replace(/ /g, '').length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Le nom figure-t-il, mot pour mot, dans la sortie (titre, lieu, mots-clés, chapô) ? Accents, majuscules et ponctuation ignorés. */
export function mentions(e, name) {
  const words = (t) => ` ${plain(t).replace(/[^a-z0-9]+/g, ' ').trim()} `;
  const needle = words(name);
  return needle.trim().length >= 2 && words(`${e?.title ?? ''} ${e?.place ?? ''} ${e?.tags ?? ''} ${e?.lead ?? ''}`).includes(needle);
}

/** Les sorties qui citent au moins un de mes artistes : [{ e, who }], celles qui ferment le plus tôt d'abord, sans doublon. */
export function artistEvents(events, names) {
  const list = cleanArtists(names);
  if (!list.length) return [];
  const seen = new Set();
  const out = [];
  for (const e of events ?? []) {
    const who = list.filter((n) => mentions(e, n));
    if (!who.length) continue;
    const k = `${e.title}|${Math.round(e.lat * 1e3)}|${Math.round(e.lng * 1e3)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ e, who });
  }
  const far = 864e13;
  return out.sort((a, b) => (a.e.end?.getTime() ?? far) - (b.e.end?.getTime() ?? far) || a.e.title.localeCompare(b.e.title, 'fr'));
}

/* ---------- 15. Ouvert tard (v158) : les nocturnes habituelles des grands lieux ---------- */

export const LATE_CHECKED = '17 novembre 2026';
export const LAST_CHECKED = '18 novembre 2026';
/** Sans heure lue sur le site du lieu : il quitte « Ce soir » une heure avant sa fermeture (le délai le plus long relevé). */
export const LATE_MARGIN = 60;
/** « 21 h 45 », « 21 h », « minuit ». */
export const lateHour = (to) => (to === '24:00' ? 'minuit' : to.replace(/^0?(\d+):(\d\d)$/, (_, h, m) => (m === '00' ? `${h} h` : `${h} h ${m}`)));
const toMin = (to) => { const [h, m] = to.split(':').map(Number); return h * 60 + m; };
/** L'heure avant laquelle arriver (« 20:15 ») pour une fermeture `to`, d'après `last` ; '' quand le site du lieu ne l'a pas donnée. */
export const lateBefore = (to, last) => { if (!(last > 0)) return ''; const t = toMin(to) - last; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

/** Les nocturnes de ce jour-là : [{ ...lieu, to, note }], de celle qui ferme le plus tard à la plus tôt. Rien un jour férié (horaires changés). */
export function lateOn(date = new Date(), places = ART_PLACES, holiday = null) {
  if (holiday) return [];
  const out = [];
  for (const p of places) {
    for (const r of p.late ?? []) {
      if (!r.d.includes(date.getDay()) || (r.first && date.getDate() > 7)) continue;
      out.push({ ...p, to: r.to, before: lateBefore(r.to, p.last), note: [r.note, p.lateNote].filter(Boolean).join(' · ') });
      break;
    }
  }
  return out.sort((a, b) => toMin(b.to) - toMin(a.to) || a.name.localeCompare(b.name, 'fr'));
}

/** Ce soir : les nocturnes du jour où l'on peut encore entrer (jusqu'à `last` minutes avant la fermeture, LATE_MARGIN sans heure vérifiée). */
export function lateTonight(date = new Date(), places = ART_PLACES, holiday = null) {
  const now = date.getHours() * 60 + date.getMinutes();
  return lateOn(date, places, holiday).filter((p) => now < toMin(p.to) - (p.last > 0 ? p.last : LATE_MARGIN));
}

/* ---------- 16. Art dans la rue (v158) : statues, sculptures, installations (OpenStreetMap), liste de tout Paris ---------- */
// Seulement des œuvres durables et nommées : les fresques, graffitis et mosaïques (Invader…) disparaissent trop souvent
// pour être annoncées sans erreur. Liste rangée dans l'appli par le robot une fois par mois (data/oeuvres.json, v170).
export const STREET_ART_TYPES = { statue: 'Statue', sculpture: 'Sculpture', bust: 'Buste', installation: 'Installation', relief: 'Bas-relief', fountain: 'Fontaine sculptée', stone: 'Pierre sculptée' };
export const STREET_ART_QUERY = `[out:json][timeout:180];nwr["tourism"="artwork"]["name"]["artwork_type"~"^(${Object.keys(STREET_ART_TYPES).join('|')})$"](${BBOX});out center tags;`;
/** Les étiquettes OpenStreetMap lues par `parseStreetArt` (le robot ne garde qu'elles). */
export const STREET_ART_TAGS = ['name', 'artwork_type', 'artist_name', 'start_date', 'wikipedia'];

/** [{ id, name, lat, lng, type, artist, year, wiki }] ; sans nom, sans position ou d'un autre type : écarté. */
export function parseStreetArt(json) {
  const out = [];
  const seen = new Set();
  for (const e of Array.isArray(json?.elements) ? json.elements : []) {
    const t = e.tags ?? {};
    const lat = Number.isFinite(e.lat) ? e.lat : e.center?.lat;
    const lng = Number.isFinite(e.lon) ? e.lon : e.center?.lon;
    const name = typeof t.name === 'string' ? t.name.trim().slice(0, 120) : '';
    const type = STREET_ART_TYPES[t.artwork_type];
    if (!name || !type || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${name.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const year = /^(\d{4})/.exec(String(t.start_date ?? ''))?.[1] ?? '';
    const wiki = /^fr:(.+)$/.exec(String(t.wikipedia ?? ''))?.[1] ?? '';
    out.push({ id: `${e.type ?? 'n'}/${e.id ?? key}`, name, lat, lng, type,
      artist: typeof t.artist_name === 'string' ? t.artist_name.trim().slice(0, 100) : '',
      year, wiki: wiki ? `https://fr.wikipedia.org/wiki/${encodeURIComponent(wiki.replace(/ /g, '_'))}` : '' });
  }
  return out;
}

/** Les œuvres à moins de `maxM`, de la plus proche à la plus loin ; mes artistes d'abord s'ils signent une œuvre proche. */
export function streetArtNear(list, here, maxM = 1000, mine = []) {
  const names = cleanArtists(mine);
  return (list ?? []).map((a) => ({ ...a, d: distanceM(here, a), mine: names.some((n) => mentions({ title: a.artist }, n)) }))
    .filter((a) => a.d <= maxM).sort((a, b) => (b.mine - a.mine) || a.d - b.d);
}

/** Recherche de la loupe (v158) : tous les mots tapés (2 lettres au moins, 3 en tout) se trouvent dans l'un des champs. */
export function textMatch(q, ...fields) {
  const words = plain(q).split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  if (plain(q).replace(/[^a-z0-9]/g, '').length < 3 || !words.length) return false;
  const hay = plain(fields.filter(Boolean).join(' '));
  return words.every((w) => hay.includes(w));
}

/**
 * Chercher une sortie depuis Sorties (v212) : l'agenda de la semaine, seulement ce que montre l'onglet
 * (tout, le gratuit, les expos). Navigo n'est pas l'agenda : pas de recherche là. Sans doublon (même titre, même lieu),
 * celles qui finissent d'abord. La recherche se fait sur le téléphone : rien de ce qui est tapé n'est envoyé.
 */
export const FIND_LABEL = { all: 'Chercher une sortie', free: 'Chercher du gratuit', art: 'Chercher une expo' };
export function findOutings(items, q, tab = 'all') {
  const keep = tab === 'free' ? (e) => e.free === true : tab === 'art' ? isExpo : () => true;
  const seen = new Set();
  const far = 864e13;
  return (items ?? []).filter((e) => keep(e) && textMatch(q, e.title, e.place, e.tags))
    .filter((e) => { const k = `${e.title}|${e.place}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.end?.getTime() ?? far) - (b.end?.getTime() ?? far));
}

/* ---------- 17. L'artiste d'un lieu (v161) : les œuvres de mes lieux, son site ---------- */

/** Clé de comparaison d'un nom d'artiste : sans accents, majuscules ni ponctuation (« Miss.Tic » = « miss tic »). */
export const artistKey = (name) => plain(name).replace(/[^a-z0-9]+/g, ' ').trim();
/** Un nom d'artiste saisi : nettoyé comme ceux de Mes artistes, '' s'il est trop court. */
export const cleanArtist = (name) => cleanArtists([name])[0] ?? '';
/** Les lieux signés par cet artiste ; les disparus après les autres, puis du plus proche au plus loin (ou par nom). */
export function artistWorks(points, name, here = null) {
  const k = artistKey(name);
  if (!k) return [];
  return (points ?? []).filter((p) => p.artist && artistKey(p.artist) === k)
    .map((p) => ({ p, d: here ? distanceM(here, p) : null }))
    .sort((a, b) => (Boolean(a.p.gone) - Boolean(b.p.gone)) || (here ? a.d - b.d : a.p.name.localeCompare(b.p.name, 'fr')));
}
/** Les noms déjà connus (mes lieux, puis Mes artistes), sans doublon, par ordre alphabétique : pour compléter la saisie. */
export const knownArtists = (points, followed = []) => cleanArtists([...(points ?? []).map((p) => p.artist).filter(Boolean), ...cleanArtists(followed)])
  .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

/**
 * Le site ou l'Instagram d'un artiste, tel que je l'écris : une adresse https, « instagram.com/nom » ou « @nom ».
 * Renvoie l'adresse https à ouvrir, ou '' si ce n'est ni l'un ni l'autre (jamais de http, de javascript: ni d'espace).
 */
export function linkFrom(text) {
  const t = String(text ?? '').trim();
  const handle = /^@([A-Za-z0-9._]{1,30})$/.exec(t) ?? /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?$/i.exec(t);
  if (handle) return `https://www.instagram.com/${handle[1]}/`;
  if (/\s/.test(t) || t.length > 200) return '';
  const url = /^https:\/\//i.test(t) ? t : /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(t) ? `https://${t}` : '';
  try { return url && new URL(url).protocol === 'https:' ? url : ''; } catch { return ''; }
}
/** Liens des artistes : { clé du nom : { n: nom, u: adresse https } }, 200 au plus. */
export function cleanArtistLinks(obj) {
  const out = {};
  for (const v of Object.values(obj && typeof obj === 'object' ? obj : {}).slice(0, 200)) {
    const n = cleanArtist(v?.n);
    const u = linkFrom(v?.u);
    if (n && u && u === String(v.u)) out[artistKey(n)] = { n, u };
  }
  return out;
}

/* ---------- 18. Mes salles (v166) : les lieux de sortie que je suis, et leur programme de la semaine ---------- */

/** Noms de salles suivies : nettoyés, sans doublon (accents, majuscules et ponctuation ignorés), 80 signes, 100 au plus. */
export function cleanVenues(list) {
  const seen = new Set();
  const out = [];
  for (const s of Array.isArray(list) ? list : []) {
    if (typeof s !== 'string') continue;
    const name = s.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const key = artistKey(name);
    if (key.replace(/ /g, '').length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.slice(0, 100);
}
/** La salle est-elle celle de la sortie ? Son nom, mot pour mot, dans le lieu ou l'organisateur (« Philharmonie de Paris - Salle Pierre Boulez »). */
export function atVenue(e, venue) {
  const words = (t) => ` ${artistKey(t)} `;
  const needle = words(venue);
  return needle.trim().length >= 3 && words(`${e?.place ?? ''} ${e?.org ?? ''}`).includes(needle);
}
/** v519 : la salle suivie qui porte le nom d'un de mes lieux (le même nom, accents et ponctuation ignorés), ou ''. */
export function followedVenueOf(pt, venues) {
  const k = artistKey(pt?.name ?? '');
  return k.replace(/ /g, '').length >= 3 ? cleanVenues(venues).find((v) => artistKey(v) === k) ?? '' : '';
}
/** Les sorties de mes salles : [{ e, where }], la plus proche dans le temps d'abord, sans doublon. */
export function venueEvents(events, venues, now = new Date()) {
  const list = cleanVenues(venues);
  if (!list.length) return [];
  const seen = new Set();
  const out = [];
  for (const e of events ?? []) {
    const where = list.find((v) => atVenue(e, v));
    if (!where) continue;
    const k = `${e.title}|${Math.round(e.lat * 1e3)}|${Math.round(e.lng * 1e3)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ e, where });
  }
  // les rendez-vous datés d'abord, du plus proche au plus loin ; ce qui est déjà en cours (une expo) après
  const t = (x) => { const st = x.e.slots?.find((sl) => sl.end > now)?.start ?? x.e.start; return st && st >= now ? st.getTime() : now.getTime() + 8 * DAY; };
  return out.sort((a, b) => t(a) - t(b));
}

/**
 * Salles près de moi (v296) : les lieux de l'agenda de la semaine qui ont un concert ou un spectacle, à moins de `maxM`
 * du point de départ, pour les suivre dans Mes salles. Sans les Grands lieux, sans les salles déjà suivies, sans les
 * lieux qui ne sont pas des salles (bibliothèques, médiathèques, gymnases, centres Paris Anim').
 * Deux graphies d'une même salle à moins de 100 m (« 38Riv », « 38Riv Jazz Club ») n'en font qu'une, au nom le plus court :
 * suivre ce nom trouve aussi l'autre (`atVenue`). Tri sur le téléphone : la position n'est envoyée nulle part.
 * Rend [{ name, n (sorties différentes), d (mètres), lat, lng }], la plus proche d'abord.
 */
const NOT_A_HALL = ['biblioth', 'mediath', 'gymnase', 'centre paris anim'];
export function venuesNear(events, from, maxM, { followed = [], isShow = () => true, places = ART_PLACES } = {}) {
  if (!from || !Number.isFinite(from.lat)) return [];
  const mine = cleanVenues(followed);
  const groups = new Map();
  for (const e of events ?? []) {
    const name = String(e?.place ?? '').replace(/\s+/g, ' ').trim();
    const key = artistKey(name);
    if (key.replace(/ /g, '').length < 3 || !Number.isFinite(e.lat) || !isShow(e)) continue;
    if (NOT_A_HALL.some((w) => plain(name).includes(w)) || artPlaceOf(e, places) || mine.some((v) => atVenue(e, v))) continue;
    const g = groups.get(key) ?? { name, lat: e.lat, lng: e.lng, titles: new Set() };
    g.titles.add(plain(e.title));
    groups.set(key, g);
  }
  const kept = [];
  for (const g of [...groups.values()].sort((a, b) => a.name.length - b.name.length)) {
    const same = kept.find((k) => distanceM(k, g) <= 100 && atVenue({ place: g.name }, k.name));
    if (same) g.titles.forEach((t) => same.titles.add(t));
    else kept.push(g);
  }
  return kept.map((g) => ({ name: g.name, n: g.titles.size, d: distanceM(from, g), lat: g.lat, lng: g.lng }))
    .filter((g) => g.d <= maxM).sort((a, b) => a.d - b.d);
}

/**
 * v327 (mon choix 3A du 20 nov.) : les salles qui ont le plus de sorties cette semaine, dans tout l'agenda de Paris,
 * pour Réglages → Photos des salles. Comptées sur le téléphone, sans ma position. Comme « Salles près de moi » :
 * sans bibliothèques, médiathèques, gymnases ni centres Paris Anim', sans les salles déjà suivies (elles ont leur
 * partie), deux graphies d'une même salle à moins de 100 m n'en font qu'une (le nom le plus court).
 * Rend [{ name, n (sorties différentes) }], la plus présente d'abord.
 */
export function topVenues(events, { followed = [], max = 15 } = {}) {
  const mine = cleanVenues(followed);
  const groups = new Map();
  for (const e of events ?? []) {
    const name = String(e?.place ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const key = artistKey(name);
    if (key.replace(/ /g, '').length < 3 || !Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue;
    if (NOT_A_HALL.some((w) => plain(name).includes(w)) || mine.some((v) => atVenue(e, v))) continue;
    const g = groups.get(key) ?? { name, lat: e.lat, lng: e.lng, titles: new Set() };
    g.titles.add(plain(e.title));
    groups.set(key, g);
  }
  const kept = [];
  for (const g of [...groups.values()].sort((a, b) => a.name.length - b.name.length)) {
    const same = kept.find((k) => distanceM(k, g) <= 100 && atVenue({ place: g.name }, k.name));
    if (same) g.titles.forEach((t) => same.titles.add(t));
    else kept.push(g);
  }
  return kept.map((g) => ({ name: g.name, n: g.titles.size, lat: g.lat, lng: g.lng })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'fr')).slice(0, max);
}

/* ---------- 19. Garder un lieu en favori d'un appui (v167) : la catégorie devinée parmi les miennes ---------- */
// Mots cherchés dans le nom de mes catégories, du plus juste au plus large (le premier mot trouvé l'emporte)
const FAV_WORDS = {
  musee: [/musee/, /expo/, /patrimoine|visite/, /\barts?\b/, /culture/],
  expo: [/expo/, /musee/, /galerie/, /\barts?\b/, /culture/],
  galerie: [/galerie/, /\barts?\b/, /expo/, /musee/, /culture/],
  theatre: [/theatre/, /spectacle|scene/, /culture/, /sortie/],
  musique: [/concert/, /musique/, /salle/, /spectacle/, /culture/, /sortie/],
};
/**
 * La catégorie d'un lieu gardé d'un appui : la première des miennes dont le nom va avec le genre (Musées, Culture…),
 * sinon « Culture » de l'appli, sinon null (le formulaire s'ouvre alors pour la choisir). Jamais Vu en passant ni street art.
 */
export function favCategory(kind, categories) {
  const cats = (Array.isArray(categories) ? categories : []).filter((c) => c?.id && c.id !== 'vu' && c.id !== 'streetart');
  for (const re of FAV_WORDS[kind] ?? FAV_WORDS.musee) {
    const c = cats.find((x) => re.test(plain(x.name)));
    if (c) return c.id;
  }
  return cats.find((c) => c.id === 'culture')?.id ?? null;
}

/* ---------- 20. « Tu voulais dire… ? » sous le champ Artiste (v172) ---------- */

/** Distance d'édition (lettres ajoutées, retirées ou changées) entre deux clés courtes. */
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
/**
 * Les noms connus proches de ce que j'écris (3 au plus) : même nom écrit autrement (« invader » → « Invader »),
 * début d'un nom (« miss » → « Miss.Tic »), ou une à trois fautes de frappe selon la longueur. Rien si le nom tapé
 * est déjà écrit comme un nom connu, ou s'il fait moins de 3 lettres. Une proposition, jamais une correction.
 */
export function artistSuggest(text, names) {
  const typed = String(text ?? '').replace(/\s+/g, ' ').trim();
  const k = artistKey(typed);
  if (k.replace(/ /g, '').length < 3) return [];
  const list = cleanArtists(names);
  if (list.some((n) => n === typed)) return [];
  const allowed = k.length <= 5 ? 1 : k.length <= 10 ? 2 : 3;
  const scored = [];
  for (const n of list) {
    const kn = artistKey(n);
    // le nom entier, ou un de ses mots (« Mesnager » pour « Jérôme Mesnager »)
    const words = kn.split(' ').filter((w) => w.length >= 4 && w !== kn);
    const d = kn === k ? 0 : kn.startsWith(k) ? 1 : Math.min(editDistance(k, kn), ...words.map((w) => Math.max(1, editDistance(k, w))));
    if (d <= allowed || (kn !== k && kn.startsWith(k))) scored.push({ n, d });
  }
  return scored.sort((a, b) => a.d - b.d || a.n.localeCompare(b.n, 'fr')).slice(0, 3).map((x) => x.n);
}
/** « Chercher ce nom » : une recherche Google « nom + street art », ouverte seulement par mon appui (un lien, rien n'est envoyé avant). */
export const artistSearchUrl = (name) => `https://www.google.com/search?q=${encodeURIComponent(`${String(name ?? '').trim()} street art`)}`;

/* ---------- Gratuit dans N jours, au moment de Prévoir (v199) ---------- */

/** Un lieu de la liste des gratuités à moins de 150 m de `p` (hors musées de la Ville, gratuits toute l'année), ou null. */
export function freePlaceFor(p) {
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
  let best = null;
  for (const f of FREE_PLACES) {
    if (f.rule === 'always') continue;
    const d = distanceM(p, f);
    if (d <= 150 && (!best || d < best.d)) best = { f, d };
  }
  return best?.f ?? null;
}

/** Le prochain jour gratuit de ce lieu, d'aujourd'hui à `days` jours : { date, when, k } (k : jours d'écart), ou null. */
export function nextFreeFor(p, date = new Date(), days = 35) {
  const f = freePlaceFor(p);
  if (!f) return null;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  for (let k = 0; k <= days; k += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k);
    const hit = freeToday(d).find((x) => x.name === f.name);
    if (hit) return { date: d, when: hit.when, k };
  }
  return null;
}

/* ---------- Mes artistes : toute l'année dans les musées (v231, data/musees.json refait par tools/maj-merimee.py) ---------- */

/**
 * Noms de famille portés par plusieurs artistes : quand la liste de la Région n'écrit que lui (« David »), on ne devine pas
 * lequel. Il faut alors le nom complet des deux côtés (« David d'Angers »). Mon choix 3A du 19 nov. 2026.
 */
export const AMBIGUOUS_ARTISTS = new Set(['brueghel', 'cranach', 'david', 'laurens', 'la tour', 'latour', 'vernet', 'huet', 'rousseau',
  'lemoyne', 'germain', 'jacob', 'dantan', 'isabey', 'tiepolo', 'guardi', 'ruysdael', 'dufy', 'pissarro', 'delaunay', 'le brun',
  'morel fatio', 'sene', 'coustou', 'millet', 'van eyck', 'robert']);
const artNorm = (s) => plain(s).replace(/[^a-z0-9]+/g, ' ').trim();

/** Fichier de l'appli -> { updated, items: [{ id, n, a, url, lat, lng, art }] } ; une entrée douteuse est écartée. */
export function parseMusees(json) {
  const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const items = (Array.isArray(json?.items) ? json.items : []).map((m) => ({
    id: str(m?.id, 10), n: str(m?.n, 80), a: str(m?.a, 80), url: /^https:\/\/[^\s"<>]+$/.test(m?.url ?? '') ? m.url : '',
    lat: Number(m?.lat), lng: Number(m?.lng), art: Array.isArray(m?.art) ? m.art.map((x) => str(x, 40)).filter(Boolean).slice(0, 80) : [],
  })).filter((m) => m.n && m.art.length && m.lat > 48.80 && m.lat < 48.91 && m.lng > 2.22 && m.lng < 2.47);
  return { updated: /^\d{4}-\d{2}-\d{2}$/.test(json?.updated ?? '') ? json.updated : '', items };
}

/**
 * Le nom que je suis et un nom cité par un musée désignent-ils le même artiste ? Oui s'ils sont pareils (sans accents ni
 * majuscules), ou si l'un est la fin de l'autre (« Monet » et « Claude Monet », « van Gogh » et « Vincent van Gogh »),
 * sauf quand ce nom court est porté par plusieurs artistes (AMBIGUOUS_ARTISTS).
 */
export function sameArtist(followed, cited) {
  const a = artNorm(followed);
  const b = artNorm(cited);
  if (a.length < 3 || b.length < 3) return false;
  if (a === b) return true;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return long.endsWith(` ${short}`) && !AMBIGUOUS_ARTISTS.has(short);
}

/** Les musées qui citent cet artiste, du plus proche au plus loin (ou par nom sans position). */
export function museumsWith(list, name, here = null) {
  return (list ?? []).filter((m) => m.art.some((c) => sameArtist(name, c)))
    .map((m) => ({ ...m, d: here ? distanceM(here, m) : null }))
    .sort((x, y) => (here ? x.d - y.d : x.n.localeCompare(y.n, 'fr')));
}
