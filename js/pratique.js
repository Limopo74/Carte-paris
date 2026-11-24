// Fontaines à boire et toilettes publiques : données ouvertes de la Ville de Paris (licence ODbL).
import { distanceM } from './geo.js';
import { jardinName, jardinAddress } from './jardins.js';

const BASE = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets';
export const DATASETS = {
  fontaines: 'fontaines-a-boire',
  toilettes: 'sanisettesparis',
  fraisLieux: 'ilots-de-fraicheur-equipements-activites',
  fraisParcs: 'ilots-de-fraicheur-espaces-verts-frais',
};

const PARK_DAYS = [['lundi', 'Mo'], ['mardi', 'Tu'], ['mercredi', 'We'], ['jeudi', 'Th'], ['vendredi', 'Fr'], ['samedi', 'Sa'], ['dimanche', 'Su']];
/** « 08h00 - 17h00 », « 10h-19h », « 15H - 18H », « 08h30 - 12h30 / 14h00 - 17h00 » → « 08:00-17:00 » (ou « 08:30-12:30,14:00-17:00 »). */
function parkTimes(v) {
  const parts = String(v).split('/').map((x) => x.trim().toLowerCase().replace(/[–—]/g, '-').match(/^(\d{1,2})[h:](\d{2})?\s*-\s*(\d{1,2})[h:](\d{2})?$/));
  if (!parts.length || parts.some((m) => !m)) return null;
  const hm = (h, m) => `${String(Number(h)).padStart(2, '0')}:${m ?? '00'}`;
  return parts.map((m) => { const end = hm(m[3], m[4]); return `${hm(m[1], m[2])}-${end === '23:59' ? '24:00' : end}`; }).join(',');
}
/** Période « du 25/10/26 au 28/02/27 » ou « à partir du 07/06/22 » : vrai si `now` est dedans (ou si la période est absente). */
function inParkPeriod(text, now) {
  const t = String(text ?? '');
  const dates = [...t.matchAll(/(\d{2})\/(\d{2})\/(\d{2}(?:\d{2})?)/g)].map((m) => new Date(Number(m[3].length === 2 ? `20${m[3]}` : m[3]), Number(m[2]) - 1, Number(m[1])));
  if (!dates.length) return true; // pas de période (ou un simple avis) : les horaires valent toute l'année
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dates[0] > day) return false;
  return dates.length < 2 || day <= dates[1];
}
/** Horaires d'un espace vert (îlots de fraîcheur) au format OpenStreetMap, ou '' s'ils sont inconnus ou d'une autre saison. */
/** Le lieu suit-il les horaires du parc où il se trouve (« Horaires du parc », « Horaires d'ouverture de l'espace vert ») ? */
export const followsPark = (text) => /horaires? (du parc|d'ouverture de l'espace vert)/i.test(String(text ?? ''));
/**
 * Horaires d'une sanisette (« 06h00 - 22h00 », « 24/24h ») au format OpenStreetMap, ou '' si inconnus.
 * Les plages de moins de 4 h (« 06h00 - 06h02 ») sont des erreurs de saisie : on ne s'y fie pas.
 */
export function toiletHours(h) {
  const t = String(h ?? '').trim().toLowerCase().replace(/[–—]/g, '-');
  if (/^24\s*h?\s*\/\s*24/.test(t)) return '24/7';
  const m = t.match(/^(\d{1,2})[h:](\d{2})\s*-\s*(\d{1,2})[h:](\d{2})$/);
  if (!m) return '';
  const from = Number(m[1]) * 60 + Number(m[2]);
  let to = Number(m[3]) * 60 + Number(m[4]);
  if (to <= from) to += 1440;
  if (to - from < 240 || to - from > 1440) return '';
  const hm = (h2, m2) => `${String(Number(h2)).padStart(2, '0')}:${m2}`;
  const end = hm(m[3], m[4]) === '23:59' ? '24:00' : hm(m[3], m[4]);
  return `Mo-Su ${hm(m[1], m[2])}-${end}`;
}

export function parkHours(r, now = new Date()) {
  const known = (v) => v != null && v !== 'None' && String(v).trim() !== '';
  const days = PARK_DAYS.map(([d, osm]) => [osm, r?.[`horaires_${d}`]]);
  if (!days.some(([, v]) => known(v))) return str(r?.ouvert_24h) === 'Oui' ? '24/7' : '';
  if (!inParkPeriod(r?.horaires_periode, now)) return '';
  const rules = [];
  for (const [osm, v] of days) {
    if (!known(v)) return ''; // un jour inconnu : on ne devine pas
    if (/^(-|fermé|ferme)$/i.test(String(v).trim())) { rules.push(`${osm} off`); continue; }
    const t = parkTimes(v);
    if (!t) return '';
    rules.push(`${osm} ${t}`);
  }
  if (rules.every((x) => x.endsWith(' 00:00-24:00'))) {
    // v261 : « 00h00 - 23h59 » tous les jours alors que la Ville dit « pas ouvert 24 h/24 » (21 jardins, dont le parc de Bercy,
    // et les bois, en novembre 2026) : les deux champs se contredisent, on ne dit rien plutôt que « ouvert jour et nuit ».
    return str(r?.ouvert_24h) === 'Non' ? '' : '24/7';
  }
  return rules.join('; ');
}

export function exportUrl(kind) {
  // Les parcs ont des contours lourds : on ne demande que le nom, le type, l'adresse, le point central et les horaires.
  const q = kind === 'fraisParcs' ? `?select=identifiant,nom,type,adresse,geo_point_2d,ouvert_24h,horaires_periode,${PARK_DAYS.map(([d]) => `horaires_${d}`).join(',')}` : '';
  return `${BASE}/${DATASETS[kind]}/exports/json${q}`;
}

/** Position d'un enregistrement, quelle que soit la forme du champ géographique. */
function latLngOf(r) {
  const g = r?.geo_point_2d;
  if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) return { lat: g.lat, lng: g.lon };
  if (Array.isArray(g) && g.length === 2) return { lat: Number(g[0]), lng: Number(g[1]) };
  const c = r?.geo_shape?.geometry?.coordinates;
  if (Array.isArray(c) && c.length === 2 && typeof c[0] === 'number') return { lat: c[1], lng: c[0] };
  return null;
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

/** Transforme la réponse en [{ lat, lng, label, detail, ok }], en écartant ce qui est illisible. */
export function parseRecords(json, kind) {
  const out = [];
  for (const r of Array.isArray(json) ? json : []) {
    const p = latLngOf(r);
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) continue;
    if (kind === 'fontaines') {
      const num = str(r.no_voirie_pair) || str(r.no_voirie_impair);
      const street = [num, cap(str(r.voie))].filter(Boolean).join(' ');
      out.push({
        ...p,
        label: cap(str(r.modele)) || cap(str(r.type_objet)) || 'Fontaine',
        detail: [street, str(r.commune)].filter(Boolean).join(', '),
        ok: str(r.dispo).toUpperCase() !== 'NON',
        // Eau pétillante (fontaines « Pétillante ») ou brumisateur : utile quand il fait chaud
        ...(/p[ée]tillante/i.test(`${str(r.type_objet)} ${str(r.modele)}`) || /PETILLANTE/.test(str(r.type_objet)) ? { extra: 'Eau pétillante' }
          : /brumis/i.test(str(r.modele)) ? { extra: 'Brumisateur' } : {}),
      });
    } else if (kind === 'fraisLieux' || kind === 'fraisParcs') {
      const name = str(r.nom);
      const pay = str(r.payant).toLowerCase();
      out.push({
        ...p,
        // v261 : « SQUARE DU TEMPLE » s'écrit « Square du Temple » ; pour un espace vert, l'adresse seule (« Promenades ouvertes » ne parle à personne)
        label: jardinName(name) || cap(str(r.type)) || 'Lieu frais',
        detail: (kind === 'fraisParcs' ? [jardinAddress(r.adresse)] : [cap(str(r.type)), str(r.adresse), pay === 'oui' ? 'payant' : pay === 'non' ? 'gratuit' : '']).filter(Boolean).join(' · '),
        ok: true,
        hours: parkHours(r),
        ...(kind === 'fraisLieux' && followsPark(r.horaires_periode) ? { inPark: true } : {}),
        // v261 : l'identifiant relie un espace vert à son contour (data/jardins.json) ; le type distingue un jardin d'un bois ou d'une jardinière
        ...(kind === 'fraisParcs' ? { id: str(r.identifiant), type: str(r.type), address: str(r.adresse) } : {}),
      });
    } else {
      out.push({
        ...p,
        label: cap(str(r.type)) || 'Toilettes',
        detail: [str(r.adresse), str(r.horaire) ? `Horaires : ${str(r.horaire)}` : '', str(r.acces_pmr).toLowerCase() === 'oui' ? 'Accès fauteuil' : '']
          .filter(Boolean).join(' · '),
        ok: !/hors service|fermé/i.test(str(r.statut)) && !/^fermé$/i.test(str(r.horaire)),
        ...(toiletHours(r.horaire) ? { hours: toiletHours(r.horaire) } : {}),
        ...(followsPark(r.horaire) ? { inPark: true } : {}),
      });
    }
  }
  return out;
}

/** Les `n` plus proches en état de marche : [{ item, d }]. */
export function nearestOf(items, here, n = 3) {
  return items
    .filter((i) => i.ok)
    .map((item) => ({ item, d: distanceM(here, item) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n);
}

const PARK_STOP = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'l', 'd', 'et', 'a', 'au', 'aux', 'en', 'sur', 'parc', 'jardin', 'jardins', 'square', 'bois', 'promenade', 'paris', 'saint', 'st']);
const parkWords = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !PARK_STOP.has(w));
/** Un de mes lieux ressemble-t-il à un parc ou un jardin (d'après son nom ou sa catégorie) ? */
export const looksLikePark = (text) => /\b(parc|jardin|jardins|square|bois|promenade|coul[ée]e verte|buttes?|esplanade)\b/i.test(String(text ?? ''));
/** L'espace vert de la Ville qui correspond à un de mes lieux : un mot du nom en commun à moins de 500 m
    (le point de la Ville est au milieu du parc, le mien souvent à une entrée), ou moins de 40 m. Seulement s'il a des horaires. */
export function parkFor(place, parks) {
  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
  const mine = new Set(parkWords(place.name ?? place.title));
  let best = null;
  for (const x of parks) {
    if (!x.hours) continue;
    const d = distanceM(place, x);
    if (d > 500) continue;
    const common = parkWords(x.label).some((w) => mine.has(w));
    if (!common && d > 40) continue;
    const score = d - (common ? 1000 : 0);
    if (!best || score < best.score) best = { item: x, score };
  }
  return best?.item ?? null;
}

/** Toilettes des gares et stations RATP (fichier fixe data/sanitaires-ratp.json) au même format que les autres. */
export function parseRatpToilets(json) {
  return (Array.isArray(json?.items) ? json.items : []).filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng)).map((t) => ({
    lat: t.lat, lng: t.lng,
    label: `Toilettes RATP · ${t.n || 'station'}`,
    detail: [t.ou, t.zone === true ? 'Dans la zone payante : il faut un ticket ou un passe pour y aller' : t.zone === false ? 'Sans passer les tourniquets' : '', // v415 : rien quand la RATP ne le dit pas
      t.passe ? 'Porte ouverte avec un passe Navigo ou un ticket' : '', t.payant ? 'Payant' : '', t.pmr ? 'Accès fauteuil' : ''].filter(Boolean).join(' · '),
    short: [t.zone === true ? 'Zone payante : il faut un ticket' : '', t.payant ? 'Payant' : ''].filter(Boolean).join(' · '), // v398 : ce qui compte avant d'y aller (Sur mon chemin)
    ok: true,
  }));
}
