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

/* Adresses TTB masquées ou fermées (v165) : notées par moi, gardées sur le téléphone avec la liste (hors sauvegarde),
   et retrouvées après un nouvel import (même nom et même adresse, sans accents ni majuscules). */
export const TTB_MARKS_KEY = 'carte-paris.ttb-masque';
const markKey = (s) => foldName(s).replace(/[^a-z0-9]+/g, ' ').trim();
/** La clé d'une adresse du guide : son nom et son adresse. */
export const ttbKey = (x) => `${markKey(x?.name)}|${markKey(x?.address)}`;
/** { clé : { n: nom, k: 'closed' | 'hidden', at } }, 500 au plus ; le reste est écarté. */
export function cleanTtbMarks(obj) {
  const out = {};
  for (const [key, v] of Object.entries(obj && typeof obj === 'object' ? obj : {}).slice(0, 500)) {
    if (!/^[a-z0-9 ]+\|[a-z0-9 ]*$/.test(key) || !['closed', 'hidden'].includes(v?.k) || !Number.isFinite(v?.at)) continue;
    out[key] = { n: cut(v.n, 120), k: v.k, at: v.at };
  }
  return out;
}
/** Ce que j'ai noté pour cette adresse : 'closed', 'hidden' ou ''. */
export const ttbMark = (marks, x) => marks?.[ttbKey(x)]?.k ?? '';

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
 * date, celle du téléphone reste) ; les marques du téléphone restent et celles du fichier s'ajoutent.
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
    if (k in marks || Object.keys(marks).length >= 500) continue;
    marks[k] = v; newMarks++;
  }
  return { data: list ? b : (a ?? null), marks, list, newMarks };
}
