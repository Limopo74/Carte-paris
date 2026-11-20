// TTB : les adresses d'un guide de bonnes tables (source citée dans Réglages → TTB), importées sur le téléphone par la personne
// (page enregistrée avec Chrome, ou fichier préparé). Rien n'est publié dans le dépôt ni demandé à un serveur :
// le tri par distance se fait sur le téléphone. On ne garde que les informations pratiques, jamais les textes
// de la rédaction. La station de métro vient des données de l'appli (celle du site manque souvent).

export const TTB_SITE = 'https://trestresbon.fr/adresses?display=list';
export const TTB_KEY = 'carte-paris.ttb';
/** Rubriques du guide, dans l'ordre du site. */
export const TTB_RUBS = ['La Table', 'Boui-boui', 'Street-food', 'Bec sucré', 'Le panier', 'Cave'];
/** L'icône (Lucide) de chaque rubrique, dans le rond terre cuite. Pour en changer une : seulement ici. */
export const TTB_ICONS = { 'La Table': 'utensils', 'Boui-boui': 'soup', 'Street-food': 'sandwich', 'Bec sucré': 'croissant', 'Le panier': 'shopping-basket', Cave: 'wine' };
export const ttbIcon = (rub) => TTB_ICONS[rub] ?? 'utensils';
/** Les rubriques du guide qui sont des restos : le « Genre » qu'un de mes restos peut avoir (v288). Les trois autres sont des commerces. */
export const RESTO_RUBS = ['La Table', 'Boui-boui', 'Street-food'];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MAX_ITEMS = 2000;

const sp = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const cut = (t, n) => sp(t).slice(0, n);
const webUrl = (u) => (/^https?:\/\/[^\s"<>]+$/i.test(String(u ?? '').trim()) ? String(u).trim() : '');
/** Paris intra-muros (avec une marge pour le bois de Boulogne et de Vincennes). */
const inParis = (lat, lng) => lat > 48.80 && lat < 48.91 && lng > 2.22 && lng < 2.48;

/** Le HTML d'une page enregistrée par Chrome (.mhtml) : la première partie text/html, décodée si besoin.
 * Une page .html ordinaire est rendue telle quelle. */
export function mhtmlHtml(text) {
  const s = String(text ?? '');
  if (/^\s*</.test(s)) return s;
  const b = /boundary="?([^"\r\n;]+)"?/i.exec(s.slice(0, 4000));
  if (!b) return '';
  const parts = s.split(`--${b[1]}`);
  for (const part of parts) {
    const head = part.search(/\r?\n\r?\n/);
    if (head < 0) continue;
    const headers = part.slice(0, head);
    if (!/content-type:\s*text\/html/i.test(headers)) continue;
    let body = part.slice(head).replace(/^\r?\n\r?\n/, '');
    if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) body = decodeQP(body);
    return body;
  }
  return '';
}

/** Décodage « quoted-printable » (octets UTF-8). */
export function decodeQP(t) {
  const soft = String(t).replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < soft.length; i++) {
    const c = soft[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(soft.slice(i + 1, i + 3))) { bytes.push(parseInt(soft.slice(i + 1, i + 3), 16)); i += 2; } else {
      for (const x of new TextEncoder().encode(c)) bytes.push(x);
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** Les fiches brutes d'un document de la page « Adresses » (DOM du navigateur). */
export function ttbRawFromDoc(doc) {
  const out = [];
  for (const c of doc.querySelectorAll('.restaurant-infos-container')) {
    const q = (sel) => c.querySelector(sel);
    const name = (q('.restaurant-infos-text-laptop h5') ?? q('h5'))?.textContent;
    const pos = q('[lat][long]');
    const hours = {};
    for (const g of c.querySelectorAll('.hours-mobile .gallery-cell-hours')) {
      const day = sp(g.querySelector('.hours-day')?.textContent);
      if (day) hours[day] = [...g.querySelectorAll('.hours-extend')].map((x) => sp(x.textContent));
    }
    out.push({
      name, type: q('.type-restaurant')?.textContent,
      address: q('.restaurant-infos-map .infos-line')?.textContent,
      lat: Number(pos?.getAttribute('lat')), lng: Number(pos?.getAttribute('long')),
      budget: c.querySelectorAll('.restaurant-budget img[src*="filter-active"]').length,
      links: [...c.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      hours,
    });
  }
  return out;
}

/** « 12:00 » → « 12h », « 22:30 » → « 22h30 ». */
const hh = (t) => { const [h, m] = t.split(':'); return `${Number(h)}h${m === '00' ? '' : m}`; };
/** Horaires d'un jour, en texte court. Le site écrit souvent « 12:00 - 22:00 » puis « 19:00 - 22:00 » pour
 * un service midi et un service soir : la fin du midi n'est pas donnée, on ne l'invente pas. */
export function ttbDayText(slots) {
  const ok = (slots ?? []).map((x) => /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(sp(x))).filter(Boolean).map((m) => [m[1].padStart(5, '0'), m[2].padStart(5, '0')]);
  if (!ok.length) return 'fermé';
  const uniq = ok.filter((x, i) => ok.findIndex((y) => y[0] === x[0] && y[1] === x[1]) === i);
  if (uniq.length === 2 && uniq[0][1] === uniq[1][1] && uniq[1][0] > uniq[0][0]) {
    return `midi dès ${hh(uniq[0][0])}, soir ${hh(uniq[1][0])} – ${hh(uniq[1][1])}`;
  }
  return uniq.map(([a, b]) => `${hh(a)} – ${hh(b)}`).join(', ');
}

/** Une fiche propre, ou null si elle n'est pas à Paris ou incomplète. Tout reste du texte brut. */
export function cleanTtb(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = cut(raw.name, 120);
  const lat = Number(raw.lat), lng = Number(raw.lng);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || !inParis(lat, lng)) return null;
  const address = cut(raw.address, 200).replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/,\s*$/, '');
  const m = /\b75(0(?:0[1-9]|1\d|20)|116)\b\s*,?\s*(.*)$/.exec(address);
  if (!m || !/^paris\b/i.test(m[2].trim())) return null; // Paris seulement (pas Montreuil, Pantin…)
  const arr = m[1] === '116' ? 16 : Number(m[1]);
  const type = sp(raw.type).split(',').map(sp).filter(Boolean);
  const rub = TTB_RUBS.includes(type.at(-1)) ? type.at(-1) : '';
  const cuisine = cut((rub ? type.slice(0, -1) : type).join(', '), 60);
  const url = (Array.isArray(raw.links) ? raw.links : []).map(webUrl).find((u) => u && !/trestresbon\.fr/i.test(u)) ?? '';
  const h = raw.hours && typeof raw.hours === 'object' ? raw.hours : {};
  const hours = DAYS.map((d) => ttbDayText(Array.isArray(h[d]) ? h[d] : []));
  const budget = Math.max(0, Math.min(4, Math.round(Number(raw.budget) || 0)));
  return { name, rub, cuisine, address, arr, budget, url, hours: hours.every((x) => x === 'fermé') ? [] : hours, lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

/** Fiches propres, sans doublons (même nom au même endroit). */
export function cleanAll(raws) {
  const seen = new Set();
  const out = [];
  for (const r of (Array.isArray(raws) ? raws : []).slice(0, MAX_ITEMS)) {
    const x = cleanTtb(r);
    if (!x) continue;
    const k = `${x.name.toLowerCase()}|${x.lat.toFixed(4)}|${x.lng.toFixed(4)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

/** Relit une liste gardée ou un fichier préparé ({ ttb: 1, items }) : chaque fiche est revérifiée. */
export function readTtb(json) {
  if (!json || json.ttb !== 1 || !Array.isArray(json.items)) return null;
  const items = json.items.slice(0, MAX_ITEMS).map((x) => {
    if (!x || typeof x !== 'object') return null;
    const y = cleanTtb({ name: x.name, address: x.address, lat: x.lat, lng: x.lng, budget: x.budget, type: [x.cuisine, x.rub].filter(Boolean).join(', '), links: [x.url] });
    if (!y) return null;
    y.hours = Array.isArray(x.hours) && x.hours.length === 7 && x.hours.every((t) => typeof t === 'string') ? x.hours.map((t) => cut(t, 80)) : [];
    return y;
  }).filter(Boolean);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(json.date ?? '') ? json.date : '';
  return { items, date };
}

/** Ce qu'on garde sur le téléphone. */
export const ttbStore = (items, date) => ({ ttb: 1, date, items });

/** « La Table · Bistrot · €€€ » */
export function ttbKicker(x) {
  return [x.rub, x.cuisine, x.budget ? '€'.repeat(x.budget) : ''].filter(Boolean).join(' · ');
}

/** Filtre de la liste et de la carte : rubriques et budgets choisis (vide = tout). */
export function ttbPass(x, rubs, budgets) {
  return (!rubs?.size || rubs.has(x.rub)) && (!budgets?.size || budgets.has(x.budget));
}

/** v287 : ce que trient les rubriques et budgets choisis, pour l'étiquette sous la barre du haut (« La Table », « 2 rubriques, €€ »). Rien choisi : ''. */
export function ttbFilterText(rubs, budgets) {
  const r = [...(rubs ?? [])], b = [...(budgets ?? [])];
  return [r.length === 1 ? r[0] : r.length ? `${r.length} rubriques` : '', b.length === 1 ? '€'.repeat(b[0]) : b.length ? `${b.length} budgets` : ''].filter(Boolean).join(', ');
}

/** Horaires du jour (texte du site), lundi = 0. */
export const ttbToday = (x, date = new Date()) => (x.hours?.length === 7 ? x.hours[(date.getDay() + 6) % 7] : '');
export const TTB_DAYS = DAYS;

/** Date d'enregistrement d'une page .mhtml (en-tête « Date: »), en AAAA-MM-JJ, sinon ''. */
export function mhtmlDate(text) {
  const m = /^Date:\s*(.+)$/im.exec(String(text ?? '').slice(0, 2000));
  const t = m ? Date.parse(m[1]) : NaN;
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/* Catégorie proposée quand on garde une adresse TTB dans ses lieux (v155) : d'après la rubrique du guide et le nom
   de MES catégories. La première qui correspond, dans mon ordre ; aucune ne correspond : null (je choisis moi-même). */
const RUB_WORDS = {
  'la table': /resto|restau|table|bistro|brasser|cantine|manger|cuisine/,
  'boui-boui': /resto|restau|bistro|cantine|manger|cuisine|boui/,
  'street-food': /street|resto|restau|manger|snack|cantine|sandwich/,
  'bec sucre': /sucr|patiss|boulang|gateau|dessert|chocolat|glac|gourmand/,
  'le panier': /epicer|panier|marche|course|aliment|fromag|primeur/,
  cave: /cave|vin|bar\b|bars\b|apero/,
};
const foldName = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export function ttbCategory(rub, categories) {
  const re = RUB_WORDS[foldName(rub)];
  if (!re) return null;
  return (Array.isArray(categories) ? categories : []).find((c) => re.test(foldName(c?.name)))?.id ?? null;
}

/* Le genre d'un de mes restos d'après le guide (v288) : seulement quand un mot du nom est commun, à moins de 150 m.
   Jamais par la seule distance (le resto d'à côté) ni par un mot courant (« Chez », « Café », « Bistrot »…).
   Seulement une rubrique de resto ; sinon ''. */
const NAME_STOP = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'et', 'au', 'aux', 'en', 'un', 'une', 'the', 'paris', 'saint', 'chez', 'restaurant', 'restaurants',
  'resto', 'cafe', 'bar', 'bistrot', 'bistro', 'brasserie', 'cantine', 'comptoir', 'table', 'tables', 'cave', 'maison', 'petit', 'petite', 'grand', 'grande',
  'bon', 'bonne', 'vieux', 'vieille', 'nouveau', 'nouvelle', 'chef', 'cuisine', 'kitchen', 'food', 'street', 'boui', 'pizza', 'pizzeria', 'creperie', 'sushi', 'ramen', 'burger']);
const nameKeys = (s) => foldName(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !NAME_STOP.has(w));
const metres = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};
/** Le lieu de `items` qui est le même que `place` : à moins de 150 m, avec un vrai mot du nom en commun, ou exactement le même nom
 * (v289 : aussi pour la ligne TTB de mes fiches, le rond TTB caché par ma goutte et « Mon lieu » ; avant, la seule distance,
 * moins de 30 m, suffisait : le resto d'à côté). Le plus proche ; sinon null. */
export function ttbSame(place, items, keep = () => true) {
  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
  const mine = new Set(nameKeys(place.name));
  const full = foldName(place.name).replace(/[^a-z0-9]+/g, ' ').trim();
  let best = null;
  for (const x of Array.isArray(items) ? items : []) {
    if (!x || !Number.isFinite(x.lat) || !Number.isFinite(x.lng) || !keep(x)) continue;
    const d = metres(place, x);
    if (d > 150) continue;
    if (!nameKeys(x.name).some((w) => mine.has(w)) && !(full && foldName(x.name).replace(/[^a-z0-9]+/g, ' ').trim() === full)) continue;
    if (!best || d < best.d) best = { item: x, d };
  }
  return best?.item ?? null;
}
export const ttbRubByName = (place, items) => ttbSame(place, items, (x) => RESTO_RUBS.includes(x.rub))?.rub ?? '';

/* Adresses TTB masquées ou fermées (v165) : notées par moi, gardées sur le téléphone avec la liste (hors sauvegarde),
   et retrouvées après un nouvel import (même nom et même adresse, sans accents ni majuscules).
   Depuis la v218, une troisième marque, « ok » : vérifiée par moi, encore ouverte (voir plus bas). */
export const TTB_MARKS_KEY = 'carte-paris.ttb-masque';
const markKey = (s) => foldName(s).replace(/[^a-z0-9]+/g, ' ').trim();
/** La clé d'une adresse du guide : son nom et son adresse. */
export const ttbKey = (x) => `${markKey(x?.name)}|${markKey(x?.address)}`;
/** { clé : { n: nom, k: 'closed' | 'hidden' | 'ok', at } }, 500 au plus ; le reste est écarté. */
export function cleanTtbMarks(obj) {
  const out = {};
  for (const [key, v] of Object.entries(obj && typeof obj === 'object' ? obj : {}).slice(0, 500)) {
    if (!/^[a-z0-9 ]+\|[a-z0-9 ]*$/.test(key) || !['closed', 'hidden', 'ok'].includes(v?.k) || !Number.isFinite(v?.at)) continue;
    out[key] = { n: cut(v.n, 120), k: v.k, at: v.at };
  }
  return out;
}
/** Ce qui retire cette adresse de la carte et des listes : 'closed', 'hidden' ou '' (une marque « ok » ne la cache pas). */
export const ttbMark = (marks, x) => { const k = marks?.[ttbKey(x)]?.k ?? ''; return k === 'ok' ? '' : k; };

/* « Encore ouvert ? » (v218, mes choix du 19 nov.) : après « Avis Google », je note « Toujours ouvert » : marque « ok », datée.
   Elle vaut 6 mois (un resto vérifié peut fermer : une marque sans fin deviendrait fausse) ; après, l'adresse est « à revoir ». */
export const TTB_CHECK_DAYS = 183;
const CHECK_MS = TTB_CHECK_DAYS * 864e5;
/** Le moment de ma dernière vérification (même ancienne), sinon 0. */
export const ttbCheckedAt = (marks, x) => { const m = marks?.[ttbKey(x)]; return m?.k === 'ok' ? m.at : 0; };
/** Jusqu'à quand vaut une vérification faite à ce moment. */
export const ttbCheckEnd = (at) => at + CHECK_MS;
/** 'ok' (vérifiée depuis moins de 6 mois), 'old' (vérifiée il y a plus longtemps), 'no' (jamais), '' (fermée ou masquée). */
export function ttbState(marks, x, now = Date.now()) {
  if (ttbMark(marks, x)) return '';
  const at = ttbCheckedAt(marks, x);
  return !at ? 'no' : now - at < CHECK_MS ? 'ok' : 'old';
}
/** Le compteur : vérifiées, notées fermées, à voir (jamais vérifiées ou à revoir). Les masquées ne comptent nulle part. */
export function ttbCounts(items, marks, now = Date.now()) {
  const c = { ok: 0, closed: 0, todo: 0 };
  for (const x of Array.isArray(items) ? items : []) {
    const s = ttbState(marks, x, now);
    if (s === 'ok') c.ok++; else if (s) c.todo++; else if (ttbMark(marks, x) === 'closed') c.closed++;
  }
  return c;
}
/** L'interrupteur « Seulement les vérifiées » (v262, mes choix du 20 nov.) : allumé, ne garde que les adresses vérifiées depuis moins de 6 mois
 * (les « À revoir » et les jamais vérifiées s'en vont). Éteint, rend la liste telle quelle. */
export const ttbOnlyOk = (items, marks, on, now = Date.now()) => (Array.isArray(items) ? items : []).filter((x) => !on || ttbState(marks, x, now) === 'ok');
/** Les adresses à voir, par arrondissement puis par nom ; `skipped` : les clés de celles que j'ai passées. */
export function ttbQueue(items, marks, skipped = new Set(), now = Date.now()) {
  return (Array.isArray(items) ? items : []).filter((x) => ['no', 'old'].includes(ttbState(marks, x, now)) && !skipped.has(ttbKey(x)))
    .sort((a, b) => a.arr - b.arr || a.name.localeCompare(b.name, 'fr'));
}

/* TTB dans ma sauvegarde (v179, choix du 18 nov.) : la liste et mes marques partent dans le fichier quand la case
   « Avec la liste TTB » est cochée (cochée au départ). Le fichier reste sur le téléphone ou là où je l'envoie ;
   rien ne va dans le dépôt. */
/** Ce qui part dans le fichier : { ttb: 1, date, items, marks }, ou null s'il n'y a ni liste ni marque. */
export function ttbExport(data, marks) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const m = cleanTtbMarks(marks);
  if (!items.length && !Object.keys(m).length) return null;
  return { ttb: 1, date: /^\d{4}-\d{2}-\d{2}$/.test(data?.date ?? '') ? data.date : '', items, marks: m };
}
/**
 * Fusion à la restauration ou à l'import : la liste dont la page est la plus récente gagne (à date égale, ou sans
 * date, celle du téléphone reste) ; les marques du téléphone restent et celles du fichier s'ajoutent. Seule exception (v218) :
 * ma marque « ok » cède à une marque plus récente du fichier, « ok » ou « closed » (l'adresse a été revue depuis).
 * `mine` = { data: { items, date } | null, marks } ; `file` = l'objet `ttb` du fichier.
 * Renvoie { data, marks, list: true si la liste du fichier a été prise, newMarks: nombre de marques ajoutées }.
 */
export function ttbMerge(mine, file) {
  const a = mine?.data?.items?.length ? mine.data : null;
  const b = readTtb(file);
  const list = Boolean(b?.items.length) && (!a || (Boolean(b.date) && (!a.date || b.date > a.date)));
  const marks = cleanTtbMarks(mine?.marks);
  let newMarks = 0;
  for (const [k, v] of Object.entries(cleanTtbMarks(file?.marks))) {
    if (k in marks) { if (marks[k].k === 'ok' && v.k !== 'hidden' && v.at > marks[k].at) marks[k] = v; continue; }
    if (Object.keys(marks).length >= 500) continue;
    marks[k] = v; newMarks++;
  }
  return { data: list ? b : (a ?? null), marks, list, newMarks };
}
